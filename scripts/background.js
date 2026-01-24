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

// Create airplane
const airplane = new THREE.Group();

// Fuselage (body)
const fuselageGeometry = new THREE.BoxGeometry(0.4, 0.3, 1.2);
const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
airplane.add(fuselage);

// Wings
const wingGeometry = new THREE.BoxGeometry(2, 0.08, 0.5);
const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const wings = new THREE.Mesh(wingGeometry, wingMaterial);
wings.position.z = 0.1;
airplane.add(wings);

const tailVertGeometry = new THREE.BoxGeometry(0.08, 0.4, 0.3);
const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const tailVert = new THREE.Mesh(tailVertGeometry, tailMaterial);
tailVert.position.z = -0.5;
tailVert.position.y = 0.2;
airplane.add(tailVert);

const tailHorizGeometry = new THREE.BoxGeometry(0.6, 0.06, 0.25);
const tailHoriz = new THREE.Mesh(tailHorizGeometry, tailMaterial);
tailHoriz.position.z = -0.5;
airplane.add(tailHoriz);

const hubGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const hub = new THREE.Mesh(hubGeometry, hubMaterial);
hub.rotation.x = Math.PI / 2;
hub.position.z = 0.65;
airplane.add(hub);

const propellerGeometry = new THREE.BoxGeometry(0.6, 0.04, 0.08);
const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
propeller.position.z = 0.7;
airplane.add(propeller);

// Position airplane above the terrain
airplane.position.set(0, 8, 0);
airplane.rotation.order = 'YXZ';
scene.add(airplane);

// Airplane movement state
const airplaneTarget = new THREE.Vector3(0, 8, 0);
const airplaneVelocity = new THREE.Vector3(0, 0, 0);
let previousHeading = 0;
let lastMouseMoveTime = 0;
let circleCenter = new THREE.Vector3(0, 8, 0);
let circleAngle = 0;
const circleRadius = 5;
const idleTimeout = 500; // ms before starting to circle

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function changeRaycastCubes(pointer) {
  raycaster.setFromCamera(pointer, camera);

  // Only check cubes, not the airplane
  const intersects = raycaster.intersectObjects(cubes);

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x000000);
    return intersects[0].point;
  }
  return null;
}

function onPointerMove(event) {
  pointer.x = (event.clientX / container.offsetWidth) * 2 - 1;
  pointer.y = -((event.clientY + window.scrollY) / container.offsetHeight) * 2 + 1;
  const hitPoint = changeRaycastCubes(pointer);

  if (hitPoint) {
    airplaneTarget.set(hitPoint.x, 8, hitPoint.z);
    lastMouseMoveTime = Date.now();
    circleCenter.set(hitPoint.x, 8, hitPoint.z);
  }
}

function onTouchMove(event) {
  pointer.x = (event.touches[0].clientX / container.offsetWidth) * 2 - 1;
  pointer.y = -((event.touches[0].clientY + window.scrollY) / container.offsetHeight) * 2 + 1;
  const hitPoint = changeRaycastCubes(pointer);

  if (hitPoint) {
    airplaneTarget.set(hitPoint.x, 8, hitPoint.z);
    lastMouseMoveTime = Date.now();
    circleCenter.set(hitPoint.x, 8, hitPoint.z);
  }
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

  // Airplane idle animation
  const isIdle = Date.now() - lastMouseMoveTime > idleTimeout;
  if (isIdle) {
    // Check if plane has reached the mouse first
    const distToCenter = airplane.position.distanceTo(circleCenter);
    if (distToCenter < circleRadius + 1) {
      circleAngle += 0.015; // Slow rotation speed
      airplaneTarget.x = circleCenter.x + Math.cos(circleAngle) * circleRadius;
      airplaneTarget.z = circleCenter.z + Math.sin(circleAngle) * circleRadius;
    }
  }

  const direction = new THREE.Vector3();
  direction.subVectors(airplaneTarget, airplane.position);
  const distance = direction.length();

  if (distance > 0.1) {
    // Move toward target with smooth easing
    const speed = 0.08;
    direction.normalize();
    airplaneVelocity.lerp(direction.multiplyScalar(speed * Math.min(distance, 5)), 0.1);
    airplane.position.add(airplaneVelocity);

    // Calculate heading angle (rotation around Y axis)
    const heading = Math.atan2(airplaneVelocity.x, airplaneVelocity.z);
    airplane.rotation.y = heading;

    // Banking effect based on turn rate
    const turnRate = heading - previousHeading;
    // Normalize turn rate to handle wrap-around
    const normalizedTurnRate = Math.atan2(Math.sin(turnRate), Math.cos(turnRate));
    const targetBank = -normalizedTurnRate * 15; // Bank into the turn
    airplane.rotation.z = THREE.MathUtils.lerp(airplane.rotation.z, targetBank, 0.1);

    previousHeading = heading;
  } else {
    // Gradually level out when hovering
    airplane.rotation.z = THREE.MathUtils.lerp(airplane.rotation.z, 0, 0.05);
    airplaneVelocity.multiplyScalar(0.95);
  }

  propeller.rotation.z += 0.5;

  requestAnimationFrame(animate);
  renderer.render(scene, camera);

}
animate();
