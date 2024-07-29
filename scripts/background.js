import * as THREE from 'three';

const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;

let perlin_octaves = 4;
let perlin_amp_falloff = 0.5;

const scaled_cosine = i => 0.5 * (1.0 - Math.cos(i * Math.PI));

let perlin;

const noise = function(x, y = 0, z = 0) {
  if (perlin == null) {
    perlin = new Array(PERLIN_SIZE + 1);
    for (let i = 0; i < PERLIN_SIZE + 1; i++) {
      perlin[i] = Math.random();
    }
  }

  if (x < 0) {
    x = -x;
  }
  if (y < 0) {
    y = -y;
  }
  if (z < 0) {
    z = -z;
  }

  let xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  let xf = x - xi;
  let yf = y - yi;
  let zf = z - zi;
  let rxf, ryf;

  let r = 0;
  let ampl = 0.5;

  let n1, n2, n3;

  for (let o = 0; o < perlin_octaves; o++) {
    let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);

    rxf = scaled_cosine(xf);
    ryf = scaled_cosine(yf);

    n1 = perlin[of & PERLIN_SIZE];
    n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
    n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);

    of += PERLIN_ZWRAP;
    n2 = perlin[of & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
    n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);

    n1 += scaled_cosine(zf) * (n2 - n1);

    r += n1 * ampl;
    ampl *= perlin_amp_falloff;
    xi <<= 1;
    xf *= 2;
    yi <<= 1;
    yf *= 2;
    zi <<= 1;
    zf *= 2;

    if (xf >= 1.0) {
      xi++;
      xf--;
    }
    if (yf >= 1.0) {
      yi++;
      yf--;
    }
    if (zf >= 1.0) {
      zi++;
      zf--;
    }
  }
  return r;
};

const colorPalettes = [
  [
    0xFF674D,
    0xFFEC51,
    0xFFFBDB,
    0xCDC7E5,
    0x7776BC
  ],
];

const colorPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

const container = document.getElementById('canvas');
const scene = new THREE.Scene();
let aspectRatio = container.offsetWidth / container.offsetHeight;
let cameraDistance = 15;

const camera = new THREE.OrthographicCamera(0,0,0,0, 1, 200);
updateCameraAspectRatio(camera, aspectRatio);

const light = new THREE.AmbientLight( 0xffffff, .25 ); // soft white light
scene.add( light );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
directionalLight.castShadow = true;
directionalLight.position.z = -20;
directionalLight.position.x = 20;
directionalLight.position.y = 20;
scene.add( directionalLight );

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(container.offsetWidth, container.offsetHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const noiseColors = (points, noiseOffset) => {
  const colorValues = [];
  points.forEach((point, index) => {
    const { initPosition } = point;
    colorValues.push({
      index,
      noiseVal: noise(initPosition.x/8 + noiseOffset, initPosition.z/8 + noiseOffset)
    });
  });

  const sortedColors = colorValues.sort((a, b) => {
    return a.noiseVal - b.noiseVal;
  });

  const colorIndex = {}
  const sectionSize = sortedColors.length/colorPalette.length;
  sortedColors.forEach((colorVal, i) => {
    colorIndex[`${colorVal.index}`] = colorPalette[Math.floor(i/sectionSize)];
  });
  return (index) => {
    return colorIndex[index];
  }
};

const cubeWidth = 1;
const cubeAmount = 100;
const points = [];
for(let x = 0; x <= cubeAmount; x++) {
  for(let y = 0; y <= cubeAmount; y++) {
    const xPos = x * cubeWidth - cubeAmount * cubeWidth/2;
    const zPos = y * cubeWidth - cubeAmount * cubeWidth/2;
    points.push({
      initPosition: {
        x: xPos,
        z: zPos,
      }
    })
  }
}

const colorFunc = noiseColors(points, 0);

const cubes = [];
points.forEach((point,index) => {
  const {initPosition} = point;
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: colorFunc(index) });
  const cube = new THREE.Mesh(geometry, material);
  cube.receiveShadow = true;
  cube.position.x = initPosition.x;
  cube.position.z = initPosition.z;
  cubes.push(cube);
  scene.add(cube);
});

camera.position.z = 50;
camera.position.y = 50;
camera.position.x = 50;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function changeRaycastCubes(pointer) {
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x000000);
  }
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((event.clientY + window.scrollY) / window.innerHeight) * 2 + 1;
  changeRaycastCubes(pointer);
}

function onTouchMove(event) {
  pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((event.touches[0].clientY + window.scrollY) / window.innerHeight) * 2 + 1;
  changeRaycastCubes(pointer);
}

window.addEventListener('mousemove', onPointerMove);
window.addEventListener('resize', onWindowResize, false);
container.addEventListener('touchmove', onTouchMove);

function onWindowResize() {
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  updateCameraAspectRatio(camera, container.offsetWidth/container.offsetHeight);
}

function updateCameraAspectRatio(camera, aspectRatio) {
  camera.left = -cameraDistance * aspectRatio;
  camera.right = cameraDistance * aspectRatio;
  camera.top = cameraDistance;
  camera.bottom = -cameraDistance;
  camera.updateProjectionMatrix();
}


function animate() {
  camera.lookAt(0,0,0);
  const frame = renderer.info.render.frame;
  for(let i = 0; i < cubes.length; i++) {
    const cube = cubes[i];
    const height = 20 * Math.pow(noise(cube.position.x/8, cube.position.z/8), 5);
    cube.position.y = height/2;
    cube.scale.y = height + Math.pow(noise(cube.position.x/20 + frame/400, cube.position.z/20 + frame/400),5) * 30;
  }

  requestAnimationFrame(animate);
  renderer.render(scene, camera);

}
animate();
