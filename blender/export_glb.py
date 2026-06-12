# Export the hand-made cabinet to assets/cabinet.glb for the 3D shelf.
# Looks for a collection named "Cabinet" (preferred) or "HortiCabinet" (fallback).
# Includes slot_* empties as nodes. Run: python blender/bridge.py code blender/export_glb.py
import bpy, os

OUT = "C:/Users/helda/OneDrive/Documents/website/grshtaka/grshtaka.github.io-main/assets/cabinet.glb"
HELPERS = {"CabCam", "CabTarget", "CabKey", "CabFill"}  # my preview rig, never export

coll = bpy.data.collections.get("Cabinet") or bpy.data.collections.get("HortiCabinet")
if coll is None:
    raise RuntimeError("No 'Cabinet' or 'HortiCabinet' collection found")

bpy.ops.object.select_all(action='DESELECT')
n_mesh = n_slot = 0
for o in coll.all_objects:
    if o.name in HELPERS or o.type in ('CAMERA', 'LIGHT'):
        continue
    o.select_set(True)
    if o.type == 'MESH':
        n_mesh += 1
    if o.name.startswith("slot_"):
        n_slot += 1

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=True,
    export_apply=True,        # apply modifiers
    export_animations=True,   # door action, if any
    export_yup=True,
)
size = os.path.getsize(OUT)
print(f"EXPORT OK: {coll.name} -> cabinet.glb  {size/1024:.0f} KB, "
      f"{n_mesh} meshes, {n_slot} slot empties"
      + ("  [WARN >3MB - consider decimating]" if size > 3_000_000 else ""))
