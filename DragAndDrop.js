import * as RODIN from 'https://cdn.rodin.io/v0.0.1/rodinjs/RODIN.js';
import {SceneManager} from 'https://cdn.rodin.io/v0.0.1/rodinjs/scene/SceneManager.js';

import {MouseController}     from 'https://cdn.rodin.io/v0.0.1/rodinjs/controllers/MouseController.js';
import {ViveController}      from 'https://cdn.rodin.io/v0.0.1/rodinjs/controllers/ViveController.js';
import {OculusController}    from 'https://cdn.rodin.io/v0.0.1/rodinjs/controllers/OculusController.js';
import {CardboardController} from 'https://cdn.rodin.io/v0.0.1/rodinjs/controllers/CardboardController.js';

import changeParent  from 'https://cdn.rodin.io/v0.0.1/rodinjs/utils/ChangeParent.js';
import * as PhysicsUtils from 'https://cdn.rodin.io/v0.0.1/rodinjs/utils/physicsUtils.js';

let scene = SceneManager.get();
let camera = scene.camera;
let originalScene = scene.scene;

const objectKeyDown = (evt) => {
    let controller = evt.controller;
    let target = evt.target;
    let item = target.object3D;

    if (!item.initialParent) {
        item.initialParent = item.parent;
    }
    let initialParent = item.initialParent;

    if (controller instanceof MouseController) {
        item.raycastCameraPlane = new THREE.Plane();
        item.intersection = new THREE.Vector3();
        item.offset = new THREE.Vector3();

        item.raycastCameraPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(item.raycastCameraPlane.normal),
            item.getWorldPosition()
        );
        if (controller.raycaster.ray.intersectPlane(item.raycastCameraPlane, item.intersection)) {
            item.offset.copy(item.intersection).sub(item.getWorldPosition());
            if (evt.keyCode === 3) {
                item.initRotation = item.rotation.clone();
                item.initMousePos = {x: controller.axes[0], y: controller.axes[1]};
            }
        }
    }
    if (controller instanceof ViveController) {
        if (controller.intersected && controller.intersected.length > 0) {
            controller.intersected.map(intersect => {
                if (item !== intersect.object) {
                    return;
                }
                changeParent(item, controller.raycastingLine.object3D);
                let holder = new THREE.Object3D();
                holder.position.copy(item.position);
                holder.quaternion.copy(item.quaternion);
                holder.name = 'holder';
                controller.raycastingLine.object3D.add(holder);

                if (item.rigidBody) {
                    changeParent(item, initialParent);
                } else {
                    changeParent(item, holder);
                }
            });
        }
    }
    if (controller instanceof OculusController) {
        if (controller.intersected && controller.intersected.length > 0) {
            controller.intersected.map(intersect => {
                if (item !== intersect.object) {
                    return;
                }
                changeParent(item, camera);

                let holder = new THREE.Object3D();
                holder.position.copy(item.position);
                holder.name = 'holder';

                camera.add(holder);
                item.objectHolder = holder;

                if (item.rigidBody) {
                    changeParent(item, initialParent);
                } else {
                    changeParent(item, holder);
                }
            })
        }
    }
    if (controller instanceof CardboardController) {
        if (controller.intersected && controller.intersected.length > 0) {
            controller.intersected.map(intersect => {
                if (item !== intersect.object) {
                    return;
                }
                changeParent(item, camera);

                let holder = new THREE.Object3D();
                holder.position.copy(item.position);
                holder.name = 'holder';

                camera.add(holder);
                item.objectHolder = holder;

                if (item.rigidBody) {
                    changeParent(item, initialParent);
                } else {
                    changeParent(item, holder);
                }
            })
        }
    }

    controller.pickedItems.push(item);
};

const objectKeyUp = (evt) => {
    let controller = evt.controller;
    let target = evt.target;
    let item = target.object3D;
    if (!item.initialParent) {
        item.initialParent = item.parent;
    }
    let initialParent = item.initialParent;

    if (controller instanceof MouseController) {
    }
    if (controller instanceof ViveController) {
        if (controller.pickedItems && controller.pickedItems.length > 0) {
            controller.pickedItems.map(item => {
                let holder = item.parent;
                changeParent(item, initialParent);
                controller.raycastingLine.object3D.remove(holder);
            });
            if (controller.raycastingLine.object3D.children.length > 0) {
                controller.raycastingLine.object3D.children.map(item => {
                    controller.raycastingLine.object3D.remove(item);
                });
            }
            controller.raycastingLine.object3D.children = [];
        }
    }
    if (controller instanceof OculusController) {
        if (controller.pickedItems && controller.pickedItems.length > 0) {
            controller.pickedItems.map(item => {
                changeParent(item, initialParent);
                item.objectHolder = null;

                if (camera.children.length > 0) {
                    camera.children.map(item => {
                        if (item.name === "holder") {
                            camera.remove(item);
                        }
                    });
                }
            });
        }
    }
    if (controller instanceof CardboardController) {
        if (controller.pickedItems && controller.pickedItems.length > 0) {
            controller.pickedItems.map(item => {
                changeParent(item, initialParent);
                item.objectHolder = null;

                if (camera.children.length > 0) {
                    camera.children.map(item => {
                        if (item.name === "holder") {
                            camera.remove(item);
                        }
                    });
                }
            });
        }
    }

    controller.pickedItems = [];
};

let mouseWheelPrevValue = 0;
const objectValueChange = (evt) => {
    let controller = evt.controller;
    mouseWheelPrevValue = mouseWheelPrevValue || 0 ;
    let direction = MouseController.getGamepad().buttons[evt.keyCode - 1].value - mouseWheelPrevValue;
    if (controller instanceof MouseController) {
        let target = evt.target;
        let item = target.object3D;
        if (evt.keyCode === 2) {

            let directionVector = item.getWorldPosition().sub(camera.getWorldPosition());

            if (item.rigidBody) {
                let coef = 0.99;
                coef = direction > 0 ? coef : 1 / coef;
                let pointerShift = directionVector.multiplyScalar(coef).add(camera.getWorldPosition()).multiplyScalar(100);
                let vec = new OIMO.Vec3(pointerShift.x, pointerShift.y, pointerShift.z);
                item.rigidBody.body.sleeping = false;
                item.rigidBody.body.setPosition(vec);
            } else {
                let coef = 0.95;
                coef = direction > 0 ? coef : 1 / coef;
                item.Sculpt.setGlobalPosition(directionVector.multiplyScalar(coef).add(camera.getWorldPosition()));
            }
        }
    }
    mouseWheelPrevValue = MouseController.getGamepad().buttons[evt.keyCode - 1].value;
};

const objectUpdate = function () {
    if (this instanceof MouseController) {
        this.raycaster.setFromCamera({x: this.axes[0], y: this.axes[1]}, camera);

        if (this.pickedItems && this.pickedItems.length > 0) {
            this.pickedItems.map(item => {
                if (this.raycaster.ray.intersectPlane(item.raycastCameraPlane, item.intersection)) {

                    if (this.keyCode === 1) {
                        if (item.rigidBody) {
                            let pointerShift = item.intersection.sub(item.offset).multiplyScalar(100);
                            let vec = new OIMO.Vec3(pointerShift.x, pointerShift.y, pointerShift.z);
                            item.rigidBody.body.sleeping = false;
                            item.rigidBody.body.setPosition(vec);
                        } else {
                            item.Sculpt.setGlobalPosition(item.intersection.sub(item.offset));
                        }
                    } else if (this.keyCode === 3) {
                        let shift = {x: this.axes[0] - item.initMousePos.x, y: this.axes[1] - item.initMousePos.y};
                        item.initMousePos = {x: this.axes[0], y: this.axes[1]};
                        let deltaRotationQuaternion = new THREE.Quaternion()
                            .setFromEuler(
                                new THREE.Euler(-shift.y * Math.PI, shift.x * Math.PI, 0, 'XYZ')
                            );

                        if (item.rigidBody) {
                            item.rigidBody.body.sleeping = false;
                            let pointerShift = new THREE.Quaternion();
                            let bodyQuat = PhysicsUtils.oimoToThree(item.rigidBody.body.getQuaternion());
                            pointerShift.multiplyQuaternions(deltaRotationQuaternion, bodyQuat);
                            let quat = new OIMO.Quaternion(
                                pointerShift.x,
                                pointerShift.y,
                                pointerShift.z,
                                pointerShift.w);

                            item.rigidBody.body.setQuaternion(quat);
                        } else {
                            let pointerShift = new THREE.Quaternion();
                            pointerShift.multiplyQuaternions(deltaRotationQuaternion, item.getWorldQuaternion());
                            item.Sculpt.setGlobalQuaternion(pointerShift);
                        }
                    }
                }
            });
        }
    }
    if (this instanceof ViveController) {
        if (this.pickedItems && this.pickedItems.length > 0) {
            this.pickedItems.map(item => {
                if (item.rigidBody) {
                    if (item.rigidBody.body instanceof OIMO.RigidBody) {
                        item.rigidBody.body.sleeping = false;
                        let holderPos = this.raycastingLine.object3D.children[0].getWorldPosition();
                        let vecPos = new OIMO.Vec3(holderPos.x * 100, holderPos.y * 100, holderPos.z * 100);
                        item.rigidBody.body.setPosition(vecPos);

                        let holderQuat = this.raycastingLine.object3D.children[0].getWorldQuaternion();
                        let vecQuat = new OIMO.Quaternion(holderQuat.x * 100, holderQuat.y * 100, holderQuat.z * 100, holderQuat.w * 100);
                        item.rigidBody.body.setQuaternion(vecQuat);
                    }
                }
            });
        }
    }
    if (this instanceof OculusController) {
        if (this.pickedItems && this.pickedItems.length > 0) {
            this.pickedItems.map(item => {
                if (item.rigidBody) {
                    if (item.rigidBody.body instanceof OIMO.RigidBody) {
                        item.rigidBody.body.sleeping = false;
                        let targetPos = item.objectHolder.getWorldPosition();
                        let vec = new OIMO.Vec3(targetPos.x * 100, targetPos.y * 100, targetPos.z * 100);
                        item.rigidBody.body.setPosition(vec);
                    }
                }
            });
        }
    }
    if (this instanceof CardboardController) {
        if (this.pickedItems && this.pickedItems.length > 0) {
            this.pickedItems.map(item => {
                if (item.rigidBody) {
                    if (item.rigidBody.body instanceof OIMO.RigidBody) {
                        item.rigidBody.body.sleeping = false;
                        let targetPos = item.objectHolder.getWorldPosition();
                        let vec = new OIMO.Vec3(targetPos.x * 100, targetPos.y * 100, targetPos.z * 100);
                        item.rigidBody.body.setPosition(vec);
                    }
                }
            });
        }
    }
};

function ViveControllerKeyDown(keyCode) {
    this.engaged = true;
    if (!this.pickedItems) {
        this.pickedItems = [];
    }
}
function ViveControllerKeyUp(keyCode) {
    this.engaged = false;
}

function OculusControllerKeyDown(keyCode) {
    this.engaged = true;
    if (!this.pickedItems) {
        this.pickedItems = [];
    }
}
function OculusControllerKeyUp(keyCode) {
    this.engaged = false;
}

function CardboardControllerKeyDown(keyCode) {
    this.engaged = true;
    if (!this.pickedItems) {
        this.pickedItems = [];
    }
}
function CardboardControllerKeyUp(keyCode) {
    this.engaged = false;
}

function MouseControllerKeyDown(keyCode) {
}
function MouseControllerKeyUp(keyCode) {
}

export const DragAndDrop = {
    objectKeyDown,
    objectValueChange,
    objectUpdate,
    objectKeyUp,
    ViveControllerKeyUp,
    ViveControllerKeyDown,
    OculusControllerKeyDown,
    OculusControllerKeyUp,
    CardboardControllerKeyDown,
    CardboardControllerKeyUp,
    MouseControllerKeyDown,
    MouseControllerKeyUp
};
