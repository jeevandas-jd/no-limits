#!/usr/bin/env python3
"""
Generate brain surface + anatomically-shaped activation region meshes from MNI152 NIfTI.

Uses scikit-image marching cubes (same approach as NeuraLens) to extract:
  1. brain_surface.obj  — semi-transparent anatomical context
  2. region_broca.obj   — Broca's area (IFG: BA44 + BA45)
  3. region_wernicke.obj — Wernicke's area (posterior STG)
  4. region_dlpfc.obj   — DLPFC (middle frontal gyrus)
  5. region_sma.obj     — SMA (medial BA6)
  6. region_amygdala.obj — Amygdala (subcortical)

Each region uses multiple MNI sub-centers with anisotropic covariance matrices
that follow the anatomical shape of the structure, masked to gray matter.

Usage:
    /opt/homebrew/bin/python3 frontend/scripts/generate_brain_mesh.py
"""

import os
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter, binary_fill_holes, binary_dilation
from skimage.measure import marching_cubes

# ─── Paths ────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(SCRIPT_DIR, "..", "public")
NIFTI_PATH = os.path.join(PUBLIC_DIR, "MNI152_T1_1mm.nii.gz")

# ─── Brain regions — anatomically-shaped definitions ──────────────────
#
# Each region has multiple sub-centers that trace the gyrus/structure,
# plus an anisotropic covariance matrix defining directional spread.
# "sigmas" is [sigma_i, sigma_j, sigma_k] in voxel space (before downsampling).
# "rotation" optionally tilts the ellipsoid to follow cortical curvature.

REGIONS = [
    {
        "id": "broca",
        "name": "Broca's area (IFG: BA44 + BA45)",
        # Inferior frontal gyrus — L-shaped, pars opercularis + pars triangularis
        "centers_mni": [
            [-48, 12, 18],   # BA44 pars opercularis (posterior)
            [-46, 16, 12],   # BA44/45 junction
            [-44, 20, 8],    # main center
            [-46, 26, 6],    # BA45 pars triangularis (anterior)
            [-48, 30, 2],    # BA45 anterior tip
            [-50, 14, 24],   # BA44 superior extent
        ],
        "sigma_mm": [8, 10, 8],   # wider anterior-posterior
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "wernicke",
        "name": "Wernicke's area (posterior STG)",
        # Superior temporal gyrus posterior — elongated along the Sylvian fissure
        "centers_mni": [
            [-52, -22, 6],   # anterior STG
            [-54, -30, 8],   # mid STG
            [-54, -40, 14],  # main center (classic Wernicke's)
            [-52, -48, 16],  # posterior STG
            [-50, -54, 20],  # angular gyrus transition
            [-56, -34, 10],  # lateral extent
        ],
        "sigma_mm": [7, 10, 7],   # elongated anterior-posterior
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "dlpfc",
        "name": "DLPFC (BA9/46)",
        # Middle frontal gyrus — elongated strip along dorsolateral surface
        "centers_mni": [
            [-42, 40, 24],   # anterior MFG
            [-44, 32, 28],   # mid-anterior
            [-46, 20, 32],   # main center
            [-44, 12, 36],   # posterior MFG
            [-40, 44, 20],   # anterior-inferior extent
            [-46, 24, 38],   # superior extent
        ],
        "sigma_mm": [7, 10, 7],   # elongated anterior-posterior
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "sma",
        "name": "SMA (medial BA6)",
        # Supplementary motor area — medial surface, elongated anterior-posterior
        "centers_mni": [
            [-4, 8, 56],     # pre-SMA (anterior)
            [-2, 2, 58],     # SMA proper anterior
            [0, -4, 60],     # main center
            [2, -10, 62],    # SMA proper posterior
            [4, -16, 64],    # posterior extent
            [0, 0, 66],      # superior extent (near vertex)
        ],
        "sigma_mm": [8, 10, 6],   # elongated A-P, narrow medial-lateral
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "amygdala",
        "name": "Amygdala",
        # Subcortical almond-shaped nucleus — compact but not spherical
        "centers_mni": [
            [-24, -4, -22],  # main center (centromedial)
            [-22, -2, -18],  # dorsal aspect
            [-26, -6, -24],  # ventral aspect
            [-20, 0, -16],   # anterior tip
            [-28, -8, -22],  # lateral nucleus
            [-22, -4, -26],  # basal nucleus
        ],
        "sigma_mm": [5, 5, 5],    # compact, roughly isotropic
        "gm_threshold_pct": 20,   # subcortical — lower threshold
        "mc_level": 0.18,
    },
]


def write_obj(vertices, faces, normals, filepath):
    """Write a mesh to OBJ format."""
    with open(filepath, "w") as f:
        f.write(f"# {os.path.basename(filepath)}\n")
        f.write(f"# Vertices: {len(vertices)}, Faces: {len(faces)}\n\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        f.write("\n")
        for n in normals:
            f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")
        f.write("\n")
        for face in faces:
            a, b, c = face + 1  # OBJ is 1-indexed
            f.write(f"f {a}//{a} {b}//{b} {c}//{c}\n")


def mni_to_voxel(mni_coord, affine):
    """Convert MNI coordinate to voxel coordinate using inverse affine."""
    inv_affine = np.linalg.inv(affine)
    mni_homo = np.array([*mni_coord, 1.0])
    voxel = (inv_affine @ mni_homo)[:3]
    return voxel


def voxel_to_threejs(vertices, center, extent):
    """
    Transform voxel-space vertices to Three.js coordinates.
    Centers and scales to ~2 unit bounding box, then remaps axes:
      MNI X (left-right)  -> Three.js X
      MNI Z (up-down)     -> Three.js Y
      MNI Y (front-back)  -> Three.js -Z
    """
    scaled = (vertices - center) * (2.0 / extent)
    return np.column_stack([
        scaled[:, 0],    # X stays
        scaled[:, 2],    # MNI Z -> Three Y
        -scaled[:, 1],   # MNI Y -> -Three Z
    ])


def normals_to_threejs(normals):
    """Remap normal axes for Three.js."""
    return np.column_stack([
        normals[:, 0],
        normals[:, 2],
        -normals[:, 1],
    ])


def build_region_field(data_region, region, affine, region_step):
    """
    Build a scalar field for a brain region using multiple anisotropic
    Gaussian sub-centers, masked to gray matter tissue.
    Returns a 3D numpy array with the combined field.
    """
    region_shape = data_region.shape
    voxel_size = abs(affine[0, 0]) * region_step

    # Convert sigma from mm to downsampled voxels
    sigma_vox = [s / voxel_size for s in region["sigma_mm"]]

    # Build coordinate grids (only once)
    ii, jj, kk = np.mgrid[0:region_shape[0], 0:region_shape[1], 0:region_shape[2]]

    # Accumulate Gaussian contributions from all sub-centers
    field = np.zeros(region_shape, dtype=np.float64)

    for mni_center in region["centers_mni"]:
        vc = mni_to_voxel(mni_center, affine) / region_step

        # Anisotropic distance (each axis has its own sigma)
        dist_sq = (
            ((ii - vc[0]) / sigma_vox[0]) ** 2 +
            ((jj - vc[1]) / sigma_vox[1]) ** 2 +
            ((kk - vc[2]) / sigma_vox[2]) ** 2
        )
        field += np.exp(-dist_sq / 2.0)

    # Normalize to [0, 1]
    field /= field.max()

    # Gray matter mask — use intensity band (gray matter is mid-intensity in T1)
    nonzero = data_region[data_region > 0]
    gm_low = np.percentile(nonzero, region["gm_threshold_pct"])
    gm_high = np.percentile(nonzero, 95)
    gm_mask = (data_region >= gm_low) & (data_region <= gm_high)

    # For subcortical structures (amygdala), also include slightly lower intensities
    if region["gm_threshold_pct"] < 25:
        subcort_low = np.percentile(nonzero, 10)
        subcort_mask = data_region >= subcort_low
        gm_mask = gm_mask | subcort_mask

    # Dilate GM mask slightly to smooth boundary
    gm_mask = binary_dilation(gm_mask, iterations=1)

    # Apply tissue mask
    field *= gm_mask.astype(np.float64)

    # Smooth for organic surface (less smoothing = more gyral detail)
    field = gaussian_filter(field, sigma=0.8)

    # Re-normalize after masking
    if field.max() > 0:
        field /= field.max()

    return field


def main():
    print(f"Loading {NIFTI_PATH}...")
    img = nib.load(NIFTI_PATH)
    data = img.get_fdata()
    affine = img.affine
    shape = data.shape
    print(f"  Volume: {shape}, range: [{data.min():.1f}, {data.max():.1f}]")

    # ── Step 1: Extract brain surface ────────────────────────────────

    print("\n=== Brain Surface ===")
    step = 3  # downsample for web-friendly mesh
    data_ds = data[::step, ::step, ::step]

    # Brain mask: threshold at ~25th percentile of non-zero voxels
    threshold = np.percentile(data_ds[data_ds > 0], 25)
    brain_mask = data_ds > threshold

    # Fill holes and smooth
    brain_mask = binary_fill_holes(brain_mask)
    smoothed = gaussian_filter(brain_mask.astype(np.float64), sigma=1.5)

    verts, faces, normals, _ = marching_cubes(smoothed, level=0.5)

    # Scale back to original voxel space
    verts_orig = verts * step

    # Transform to MNI space
    ones = np.ones((len(verts_orig), 1))
    verts_mni = (affine @ np.hstack([verts_orig, ones]).T).T[:, :3]

    # Compute global centering/scaling (shared by brain + regions)
    global_center = (verts_mni.max(axis=0) + verts_mni.min(axis=0)) / 2
    global_extent = (verts_mni.max(axis=0) - verts_mni.min(axis=0)).max()

    print(f"  Global center: [{global_center[0]:.1f}, {global_center[1]:.1f}, {global_center[2]:.1f}]")
    print(f"  Global extent: {global_extent:.1f} mm, scale: {2.0/global_extent:.6f}")

    verts_three = voxel_to_threejs(verts_mni, global_center, global_extent)
    normals_three = normals_to_threejs(normals)

    brain_path = os.path.join(PUBLIC_DIR, "brain_surface.obj")
    write_obj(verts_three, faces, normals_three, brain_path)
    print(f"  Saved: {brain_path}")
    print(f"  {len(verts_three)} vertices, {len(faces)} faces, {os.path.getsize(brain_path)/1024:.0f} KB")

    # ── Step 2: Extract anatomically-shaped region meshes ─────────────

    print("\n=== Anatomically-Shaped Region Meshes ===")

    region_step = 2
    data_region = data[::region_step, ::region_step, ::region_step]

    for region in REGIONS:
        print(f"\n  [{region['id']}] {region['name']}")
        print(f"    Sub-centers: {len(region['centers_mni'])} MNI points")
        print(f"    Sigma (mm): {region['sigma_mm']}")

        # Build the anatomically-shaped field
        field = build_region_field(data_region, region, affine, region_step)

        print(f"    Field max: {field.max():.3f}, nonzero voxels: {(field > 0.01).sum()}")

        # Extract mesh
        try:
            r_verts, r_faces, r_normals, _ = marching_cubes(field, level=region["mc_level"])
        except ValueError:
            print(f"    SKIP: no surface found at level={region['mc_level']}")
            continue

        # Scale back to original voxel space
        r_verts_orig = r_verts * region_step

        # Transform to MNI
        r_verts_mni = (affine @ np.hstack([r_verts_orig, np.ones((len(r_verts_orig), 1))]).T).T[:, :3]

        # Same centering/scaling as brain surface
        r_verts_three = voxel_to_threejs(r_verts_mni, global_center, global_extent)
        r_normals_three = normals_to_threejs(r_normals)

        # Print bounding box for debugging
        bbox_min = r_verts_mni.min(axis=0)
        bbox_max = r_verts_mni.max(axis=0)
        bbox_size = bbox_max - bbox_min
        print(f"    MNI bbox: [{bbox_min[0]:.0f},{bbox_min[1]:.0f},{bbox_min[2]:.0f}] to [{bbox_max[0]:.0f},{bbox_max[1]:.0f},{bbox_max[2]:.0f}]")
        print(f"    Extent: {bbox_size[0]:.0f} x {bbox_size[1]:.0f} x {bbox_size[2]:.0f} mm")

        region_path = os.path.join(PUBLIC_DIR, f"region_{region['id']}.obj")
        write_obj(r_verts_three, r_faces, r_normals_three, region_path)
        print(f"    Saved: {region_path}")
        print(f"    {len(r_verts_three)} vertices, {len(r_faces)} faces, {os.path.getsize(region_path)/1024:.0f} KB")


if __name__ == "__main__":
    main()
