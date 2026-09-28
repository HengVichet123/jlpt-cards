/* 3D konbini built from simple shapes with Three.js (r128, vendored).
   mountKonbini3D(container, onPick) -> { select(id), dispose() }
   Every object belongs to a Group whose userData.id matches konbini.json. */
function mountKonbini3D(container, onPick){
  const T = THREE;
  const W = () => container.clientWidth, H = () => container.clientHeight;
  const renderer = new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.background = new T.Color(0xEEF1F2);
  // isometric illustration: orthographic camera, fixed angle, fitted to the store
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(10, 10, 10);
  const fit = () => {
    const a = W()/H();
    const hh = Math.max(7.6 / a, 4.4);            // whole store (±7.4 wide in iso view) always fits
    camera.left = -hh*a; camera.right = hh*a; camera.top = hh; camera.bottom = -hh;
    camera.updateProjectionMatrix();
  };
  fit();

  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .9, 0);
  controls.enabled = false; // fixed view: tap only, no moving
  controls.enableDamping = false;
  controls.minDistance = 4; controls.maxDistance = 20;
  controls.maxPolarAngle = 1.42; controls.enablePan = false;

  scene.add(new T.HemisphereLight(0xffffff, 0x99a4aa, 0.75));
  const sun = new T.DirectionalLight(0xffffff, 0.65);
  sun.position.set(4, 9, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left:-8, right:8, top:8, bottom:-8});
  scene.add(sun);

  const mat = c => new T.MeshStandardMaterial({color:c, roughness:.75, metalness:.05});
  const box = (w,h,d,c,x,y,z,g) => { const m = new T.Mesh(new T.BoxGeometry(w,h,d), mat(c)); m.position.set(x,y,z);
    m.castShadow = m.receiveShadow = true; (g||scene).add(m); return m; };
  const cyl = (r,h,c,x,y,z,g) => { const m = new T.Mesh(new T.CylinderGeometry(r,r,h,16), mat(c)); m.position.set(x,y,z);
    m.castShadow = true; (g||scene).add(m); return m; };
  const groups = {};
  const group = id => { const g = new T.Group(); g.userData.id = id; scene.add(g); groups[id] = g; return g; };

  // room
  box(11, .1, 9, 0xD9DEE0, 0, -.05, 0);                  // floor
  box(11, 3.2, .15, 0xF4F6F7, 0, 1.6, -4.5);             // back wall
  box(.15, 3.2, 9, 0xF4F6F7, -5.5, 1.6, 0);              // left wall
  box(11, .35, .16, 0x2E8B57, 0, 3.05, -4.4);            // brand stripe
  box(11, .12, .17, 0xF29B38, 0, 2.82, -4.4);

  // drinks fridge along back wall (left)
  let g = group("fridge");
  box(3.4, 2.3, .8, 0xC9D3D8, -3.3, 1.15, -4);
  const bottle = [0x3A86C8, 0xE0503F, 0x5BAE5B, 0xF2C14E, 0x9C6ADE];
  for(let row = 0; row < 3; row++) for(let i = 0; i < 9; i++)
    cyl(.09, .42, bottle[(i + row) % 5], -4.7 + i*.35, .45 + row*.72, -3.55, g);
  box(3.4, .06, .02, 0x8A979D, -3.3, .25, -3.58, g);

  // center gondola: onigiri / bento / snacks
  box(2.8, .9, 1.2, 0xC9D3D8, 0, .45, -.2);
  g = group("onigiri");
  box(2.8, .06, 1.2, 0xffffff, 0, 1.65, -.2, g);
  for(let i = 0; i < 6; i++){
    const o = new T.Mesh(new T.ConeGeometry(.2, .32, 3), mat(0xffffff)); o.position.set(-1.1 + i*.44, 1.85, -.2);
    o.castShadow = true; g.add(o);
    box(.18, .12, .08, 0x1F2D2A, -1.1 + i*.44, 1.76, -.02, g);
  }
  g = group("bento");
  box(2.8, .06, 1.2, 0xffffff, 0, 1.15, -.2, g);
  for(let i = 0; i < 4; i++){
    box(.55, .12, .4, 0x2B2B2B, -1 + i*.66, 1.24, -.2, g);
    box(.22, .03, .3, 0xffffff, -1.12 + i*.66, 1.31, -.2, g);
    box(.22, .03, .3, [0xE0503F, 0xC97B3A, 0xF2C14E, 0x6BB36B][i], -.88 + i*.66, 1.31, -.2, g);
  }
  g = group("snacks");
  box(2.8, .06, 1.2, 0xffffff, 0, .92, -.2, g);
  for(let i = 0; i < 6; i++) box(.34, .4, .12, bottle[i % 5], -1.15 + i*.46, .7, .42, g);

  // back counter with coffee + microwave (right)
  box(3.4, .9, .7, 0xB9C1C4, 3.4, .45, -4.05);
  g = group("coffee");
  box(.6, .8, .5, 0x3B3B3B, 2.3, 1.3, -4.05, g);
  box(.4, .2, .02, 0x7FC4E8, 2.3, 1.5, -3.79, g);
  cyl(.1, .18, 0xffffff, 2.3, .99, -3.85, g);
  g = group("microwave");
  box(.9, .5, .55, 0xD8DCDE, 3.6, 1.15, -4.05, g);
  box(.55, .34, .02, 0x3B3B3B, 3.48, 1.15, -3.77, g);

  // front counter with register, hot snacks, bag; clerk behind
  box(3.6, 1, .9, 0xB9C1C4, 3.2, .5, 1.6);
  box(3.6, .06, .95, 0x6E7A80, 3.2, 1.02, 1.6);
  g = group("register");
  box(.7, .12, .5, 0x555555, 4.3, 1.11, 1.6, g);
  box(.5, .4, .06, 0x3B3B3B, 4.3, 1.42, 1.45, g);
  box(.4, .26, .01, 0x7FC4E8, 4.3, 1.45, 1.49, g);
  g = group("hotsnack");
  box(1, .6, .6, 0xF7E7C6, 2.2, 1.35, 1.6, g);
  box(1, .08, .6, 0xE0503F, 2.2, 1.69, 1.6, g);
  for(let i = 0; i < 3; i++) cyl(.1, .12, 0xC97B3A, 1.95 + i*.25, 1.15, 1.65, g);
  g = group("bag");
  box(.35, .45, .2, 0xffffff, 3.3, 1.28, 1.7, g);
  g = group("clerk");
  cyl(.28, 1.1, 0x2E8B57, 3.4, .95, .6, g);
  const head = new T.Mesh(new T.SphereGeometry(.24, 20, 16), mat(0xF2D2B3)); head.position.set(3.4, 1.75, .6); g.add(head);
  const hair = new T.Mesh(new T.SphereGeometry(.25, 20, 16, 0, Math.PI*2, 0, 1.3), mat(0x3B2A20)); hair.position.set(3.4, 1.78, .6); g.add(hair);

  // left front: ATM, copier, magazine rack; floor: basket, trash
  g = group("atm");
  box(.8, 1.7, .7, 0x2F5D8A, -4.8, .85, 1.5, g);
  box(.5, .35, .02, 0x7FC4E8, -4.8, 1.35, 1.86, g);
  g = group("copier");
  box(1, 1, .8, 0xE6E9EB, -3.6, .5, 1.5, g);
  box(1, .12, .8, 0xC9D3D8, -3.6, 1.06, 1.5, g);
  g = group("magazines");
  box(1.4, 1, .4, 0xC9D3D8, -1.8, .5, 3.6, g);
  [0xE0503F, 0x3A86C8, 0xF2C14E, 0x5BAE5B].forEach((c,i) => box(.3, .4, .03, c, -2.25 + i*.3, .75, 3.39, g));
  g = group("basket");
  box(.6, .3, .4, 0xE0503F, 0, .15, 2.2, g);
  g = group("trash");
  box(.7, .8, .5, 0x6E7A80, 1.4, .4, 3.4, g);

  // selection, highlight, picking
  let selected = null;
  const setGlow = (grp, on) => grp.traverse(o => { if(o.material){ o.material.emissive = new T.Color(on ? 0x5a1510 : 0x000000); } });
  let aim = null;
  function select(id, focus){
    if(selected) setGlow(selected, false);
    selected = groups[id] || null;
    if(selected){ setGlow(selected, true); }
    kick();
  }
  const ray = new T.Raycaster(), p = new T.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", e => { down = {x:e.clientX, y:e.clientY}; });
  renderer.domElement.addEventListener("pointerup", e => {
    if(!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    p.set(((e.clientX - r.left)/r.width)*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
    ray.setFromCamera(p, camera);
    const hit = ray.intersectObjects(Object.values(groups), true)[0];
    if(!hit) return;
    let o = hit.object; while(o && !o.userData.id) o = o.parent;
    if(o){ select(o.userData.id); onPick(o.userData.id); }
  });

  // floating label over the selected object
  const label = document.createElement("div"); label.className = "label3d"; label.hidden = true;
  container.appendChild(label);
  const tmp = new T.Box3(), v = new T.Vector3();
  function placeLabel(){
    if(!selected){ label.hidden = true; return; }
    tmp.setFromObject(selected); tmp.getCenter(v); v.y = tmp.max.y + .15; v.project(camera);
    label.hidden = false;
    label.style.left = ((v.x + 1)/2 * W()) + "px";
    label.style.top = ((1 - v.y)/2 * H()) + "px";
  }

  // render only when something changes
  let raf = 0, alive = true;
  function frame(){ raf = 0; if(!alive) return;
    if(aim){ controls.target.lerp(aim, .15); if(controls.target.distanceTo(aim) < .02) aim = null; kick(); }
    if(controls.update()) kick(); renderer.render(scene, camera); placeLabel(); }
  function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
  controls.addEventListener("change", kick);
  const onResize = () => { renderer.setSize(W(), H()); fit(); kick(); };
  window.addEventListener("resize", onResize);
  kick();

  return {
    select, setLabel: t => { label.textContent = t; kick(); },
    dispose(){ alive = false; window.removeEventListener("resize", onResize); controls.dispose(); renderer.dispose(); container.innerHTML = ""; }
  };
}
