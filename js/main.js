import * as THREE from "./jsm/three.module.js";
import { OrbitControls } from "./jsm/OrbitControls.js";
import { Noise } from "./PerlinNoise.js";

import { GUI } from "./jsm/lil-gui.module.min.js";
import vertexShader from "../../shaders/nebula.vert.glsl.js";
import fragmentShader from "../../shaders/nebula.frag.glsl.js";

let renderer, scene, camera;
let mesh;
var backgroundChoice = 1;
const size = 128;
let xr = 1,
  yr = 0.3;
let mask;
let scale = 0.5,
  octaves = 3,
  persistence = 0.5;
let pos_x = 0,
  pos_y = 0,
  pos_z = 0;

function generateEllipsoidMask(xr, yr) {
  let mask = new Uint8Array(size * size * size);
  let center = 64;
  xr *= center;
  yr *= center;

  // Hard coding zr because it doesn't affect the final render much
  let zr = 50;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        if (
          (((x - center) / xr) * (x - center)) / xr +
            (((y - center) / yr) * (y - center)) / yr +
            (((z - center) / zr) * (z - center)) / zr <=
          1
        ) {
          mask[(x * size + y) * size + z] = 1;
        } else {
          mask[(x * size + y) * size + z] = 0;
        }
      }
    }
  }
  return mask;
}

init();
animate();

function setBackground(scene) {
  scene.background = new THREE.TextureLoader().load(
    "./backgrounds/" + backgroundChoice + ".jpg"
  );
}

function generateTexture() {
  mask = generateEllipsoidMask(xr, yr);
  let data = new Uint8Array(size * size * size);

  let i = 0;

  // Get Noise
  const p = new Noise();
  const vector = new THREE.Vector3();

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d =
          1.0 -
          vector
            .set(x, y, z)
            .subScalar(size / 2)
            .divideScalar(size)
            .length();

        // Apply Ellipsoid Mask
        if (mask[i] == 1) {
          data[i] =
            (size +
              size *
                p.octave_perlin_noise(
                  (x * scale) / 1.5,
                  y * scale,
                  (z * scale) / 1.5,
                  octaves,
                  persistence
                )) *
            d *
            d;
        } else {
          data[i] = 0;
        }
        i++;
      }
    }
  }

  const texture = new THREE.Data3DTexture(data, size, size, size);

  // Only need R value from noise
  texture.format = THREE.RedFormat;
  texture.needsUpdate = true;
  return texture;
}

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  // Camera

  camera = new THREE.PerspectiveCamera(
    100,
    window.innerWidth / window.innerHeight,
    0.2,
    100
  );
  camera.position.set(0, 0, 1);

  new OrbitControls(camera, renderer.domElement);

  // Background

  setBackground(scene); // Set background image

  // Texture

  let texture = generateTexture();

  const geometry = new THREE.SphereGeometry(2);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      base: { value: new THREE.Color(0x4f4464) },
      map: { value: texture },
      cameraPos: { value: new THREE.Vector3() },
      opacity: { value: 0.25 },
      steps: { value: 100 },
      frame: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    transparent: true,
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  mesh.position.set(pos_x, pos_y, pos_z);

  const parameters = {
    noise_scale: 0.5,
    noise_octaves: 3,
    noise_persistence: 0.5,
    opacity: 0.25,
    background_choice: 1,
    color: 0x4f4464,
    ellipsoid_radius_x: 1.0,
    ellipsoid_radius_y: 0.3,
    pos_x: 0,
    pos_y: 0,
    pos_z: 0,
  };

  function update() {
    mesh.position.set(parameters.pos_x, parameters.pos_y, parameters.pos_z);
    scale = parameters.noise_scale;
    octaves = parameters.noise_octaves;
    persistence = parameters.noise_persistence;
    material.uniforms.opacity.value = parameters.opacity;
    material.uniforms.base.value = new THREE.Color(parameters.color);
    if (backgroundChoice != parameters.background_choice) {
      backgroundChoice = parameters.background_choice;
      setBackground(scene);
    }
    xr = parameters.ellipsoid_radius_x;
    yr = parameters.ellipsoid_radius_y;
    material.uniforms.map.value = generateTexture();
  }

  const gui = new GUI();

  var f1 = gui.addFolder("Position & Constraints");
  f1.add(parameters, "pos_x", -0.5, 0.5, 0.01).onChange(update);
  f1.add(parameters, "pos_y", -0.5, 0.5, 0.01).onChange(update);
  f1.add(parameters, "pos_z", -0.5, 0.5, 0.01).onChange(update);

  f1.add(parameters, "ellipsoid_radius_x", 0, 1, 0.1).onChange(update);
  f1.add(parameters, "ellipsoid_radius_y", 0, 1, 0.1).onChange(update);

  var f2 = gui.addFolder("Noise Parameters");
  f2.add(parameters, "noise_scale", 0, 0.5, 0.01).onChange(update);
  f2.add(parameters, "noise_octaves", 0, 10, 1).onChange(update);
  f2.add(parameters, "noise_persistence", 0, 1, 0.1).onChange(update);

  var f3 = gui.addFolder("Color");
  f3.add(parameters, "opacity", 0, 1, 0.01).onChange(update);
  f3.addColor(parameters, "color").onChange(update);
  f3.add(parameters, "background_choice", 1, 6, 1).onChange(update);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animate Rotation
function animate() {
  requestAnimationFrame(animate);

  mesh.material.uniforms.cameraPos.value.copy(camera.position);
  mesh.rotation.y = performance.now() / 20000;
  mesh.rotation.x = performance.now() / 40000;
  mesh.rotation.z = performance.now() / 100000;

  mesh.material.uniforms.frame.value++;

  renderer.render(scene, camera);
}
