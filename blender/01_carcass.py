# Horticulturist's Cabinet - stage 1: carcass, shelves, drawers, lattice door, apron.
# Units: meters. Cabinet front faces -Y. Body: x -0.47..0.47, z 0..1.18, y -0.13..0.13.
import bpy, math, os

COLL = "HortiCabinet"
if COLL in bpy.data.collections:
    coll = bpy.data.collections[COLL]
    for o in list(coll.objects):
        bpy.data.objects.remove(o, do_unlink=True)
else:
    coll = bpy.data.collections.new(COLL)
    bpy.context.scene.collection.children.link(coll)

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

WOOD  = mat("CabWood",  (0.062, 0.028, 0.014), 0.5)
WOOD2 = mat("CabWoodLight", (0.10, 0.052, 0.026), 0.55)
GREEN = mat("CabGreenBack", (0.055, 0.09, 0.055), 0.9)
BRASS = mat("CabBrass", (0.55, 0.36, 0.12), 0.35, 1.0)

def box(name, cx, cy, cz, sx, sy, sz, material=WOOD):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    o = bpy.context.active_object
    o.scale = (sx, sy, sz)
    o.name = name
    o.data.materials.append(material)
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    return o

T = 0.03           # panel thickness
L, R = -0.47, 0.47 # outer x
DIV = -0.10        # divider center x (left col narrow, right col wide)
ZB, ZT = 0.0, 1.18 # body bottom/top
YB, YF = 0.13, -0.13

# --- carcass ---
box("side_L", L + T/2, 0, (ZB+ZT)/2, T, 0.26, ZT-ZB)
box("side_R", R - T/2, 0, (ZB+ZT)/2, T, 0.26, ZT-ZB)
box("divider", DIV, 0, (ZB+ZT)/2, T, 0.26, ZT-ZB)
box("top", 0, 0, ZT - T/2, R-L, 0.26, T)
box("bottom", 0, 0, ZB + T/2, R-L, 0.26, T)
box("back", 0, YB - 0.006, (ZB+ZT)/2, R-L, 0.012, ZT-ZB)
# green backing inside right column
box("back_green", (DIV+R)/2, YB - 0.014, (ZB+ZT)/2, (R-DIV)-T, 0.004, ZT-ZB-2*T, GREEN)

# cornice / top display slab
box("cornice", 0, 0, ZT + 0.02, (R-L)+0.06, 0.30, 0.04)

# --- left column shelves (interior x: L+T .. DIV-T/2) ---
lc = (L + T + DIV - T/2) / 2
lw = (DIV - T/2) - (L + T)
box("shelf_L1", lc, 0, 0.88, lw, 0.24, 0.02)
box("shelf_L2", lc, 0, 0.60, lw, 0.24, 0.02)
box("shelf_L3", lc, 0, 0.32, lw, 0.24, 0.02)
# two drawers between shelf_L3 and shelf_L2
for i, z in enumerate((0.39, 0.53)):
    box(f"drawer_{i}", lc, YF + 0.012, z, lw - 0.01, 0.025, 0.115, WOOD2)
    box(f"knob_{i}", lc, YF - 0.004, z, 0.022, 0.022, 0.022, BRASS)

# --- right column interior shelves ---
rc = (DIV + T/2 + R - T) / 2
rw = (R - T) - (DIV + T/2)
box("shelf_R1", rc, 0.01, 0.84, rw, 0.20, 0.018)
box("shelf_R2", rc, 0.01, 0.44, rw, 0.20, 0.018)

# --- lattice door on right column, hinged at right, slightly ajar ---
dW = rw - 0.004
dH = (ZT - T) - (ZB + T) - 0.004
dcx, dcz = rc, (ZB + ZT) / 2
hinge = bpy.data.objects.new("door_hinge", None)
hinge.location = (R - T, YF + 0.01, dcz)
coll.objects.link(hinge)

door_parts = []
fr = 0.045  # frame width
def dbox(name, cx, cz, sx, sz, sy=0.024, m=WOOD, yoff=0.0):
    o = box(name, cx, YF + 0.01 + yoff, cz, sx, sy, sz, m)
    door_parts.append(o)
    return o

dbox("dfr_T", dcx, dcz + dH/2 - fr/2, dW, fr)
dbox("dfr_B", dcx, dcz - dH/2 + fr/2, dW, fr)
dbox("dfr_L", dcx - dW/2 + fr/2, dcz, fr, dH - 2*fr)
dbox("dfr_R", dcx + dW/2 - fr/2, dcz, fr, dH - 2*fr)
dbox("dglass", dcx, dcz, dW - 2*fr + 0.01, dH - 2*fr + 0.01, 0.006, GREEN, 0.006)
dbox("dknob", dcx - dW/2 + fr/2, dcz, 0.025, 0.025, 0.03, BRASS, -0.014)

# lattice: +/-45 deg slats clipped to the opening by boolean intersect
ow, oh = dW - 2*fr, dH - 2*fr
diag = math.hypot(ow, oh)
slats = []
step = 0.075
n = int(diag / step) + 1
for sgn in (1, -1):
    for i in range(-n, n + 1):
        d = i * step
        cx = dcx + d * math.cos(math.radians(45)) * sgn
        cz = dcz + d * math.sin(math.radians(45))
        bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, YF + 0.012, cz))
        o = bpy.context.active_object
        o.scale = (0.011, 0.007, diag)
        o.rotation_euler = (0, math.radians(45 * sgn), 0)
        slats.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in slats:
    o.select_set(True)
bpy.context.view_layer.objects.active = slats[0]
bpy.ops.object.join()
lat = bpy.context.active_object
lat.name = "door_lattice"
lat.data.materials.append(WOOD)
for c in list(lat.users_collection):
    c.objects.unlink(lat)
coll.objects.link(lat)
# clip to opening
bpy.ops.mesh.primitive_cube_add(size=1, location=(dcx, YF + 0.012, dcz))
clip = bpy.context.active_object
clip.scale = (ow, 0.05, oh)
mod = lat.modifiers.new("clip", "BOOLEAN")
mod.operation = 'INTERSECT'
mod.object = clip
bpy.context.view_layer.objects.active = lat
bpy.ops.object.modifier_apply(modifier="clip")
bpy.data.objects.remove(clip, do_unlink=True)
door_parts.append(lat)

for o in door_parts:
    o.parent = hinge
    o.matrix_parent_inverse = hinge.matrix_world.inverted()
hinge.rotation_euler = (0, 0, math.radians(28))  # ajar

# --- bottom: bracket shelf + apron + drop finials ---
box("bracket_shelf", 0, 0.01, -0.025, (R-L)+0.10, 0.32, 0.035)
box("apron", 0, YF + 0.02, -0.105, (R-L)-0.02, 0.025, 0.125, WOOD)
for sx in (L+0.07, R-0.07):
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.022, radius2=0.008,
                                    depth=0.09, location=(sx, YF + 0.02, -0.21))
    o = bpy.context.active_object
    o.rotation_euler = (math.pi, 0, 0)
    o.name = "finial"
    o.data.materials.append(WOOD)
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)

# --- camera + lights for preview renders ---
cam = bpy.data.cameras.new("CabCamData")
camo = bpy.data.objects.new("CabCam", cam)
camo.location = (0.55, -2.1, 0.75)
coll.objects.link(camo)
tgt = bpy.data.objects.new("CabTarget", None)
tgt.location = (0, 0, 0.55)
coll.objects.link(tgt)
tr = camo.constraints.new('TRACK_TO')
tr.target = tgt
key = bpy.data.lights.new("CabKeyData", 'AREA')
key.energy = 400; key.size = 2.5
keyo = bpy.data.objects.new("CabKey", key)
keyo.location = (1.6, -2.2, 1.9)
keyo.rotation_euler = (math.radians(55), 0, math.radians(35))
coll.objects.link(keyo)
fill = bpy.data.lights.new("CabFillData", 'AREA')
fill.energy = 120; fill.size = 2.0
fillo = bpy.data.objects.new("CabFill", fill)
fillo.location = (-1.8, -1.6, 0.9)
fillo.rotation_euler = (math.radians(70), 0, math.radians(-45))
coll.objects.link(fillo)

sc = bpy.context.scene
sc.camera = camo
sc.world.use_nodes = True
bg = sc.world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.92, 0.90, 0.85, 1)
    bg.inputs[1].default_value = 1.0
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'CYCLES'):
    try:
        sc.render.engine = eng
        break
    except Exception:
        pass
sc.render.resolution_x = 720
sc.render.resolution_y = 960
out = "C:/Users/helda/OneDrive/Documents/website/grshtaka/grshtaka.github.io-main/blender/renders/cabinet_v1.png"
os.makedirs(os.path.dirname(out), exist_ok=True)
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("STAGE1 OK, rendered to", out)
