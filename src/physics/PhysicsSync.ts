import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsSync {
  private meshes: Map<THREE.Object3D, RAPIER.RigidBody> = new Map();
  private previousPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
  private previousQuaternions: Map<THREE.Object3D, THREE.Quaternion> =
    new Map();

  register(mesh: THREE.Object3D, body: RAPIER.RigidBody): void {
    this.meshes.set(mesh, body);
    this.previousPositions.set(mesh, mesh.position.clone());
    this.previousQuaternions.set(mesh, mesh.quaternion.clone());
  }

  unregister(mesh: THREE.Object3D): void {
    this.meshes.delete(mesh);
    this.previousPositions.delete(mesh);
    this.previousQuaternions.delete(mesh);
  }

  update(): void {
    for (const [mesh, body] of this.meshes) {
      const pos = body.translation();
      const rot = body.rotation();

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

      this.previousPositions.set(mesh, mesh.position.clone());
      this.previousQuaternions.set(mesh, mesh.quaternion.clone());
    }
  }

  interpolate(alpha: number): void {
    for (const [mesh, body] of this.meshes) {
      const prevPos = this.previousPositions.get(mesh);
      const prevQuat = this.previousQuaternions.get(mesh);

      if (prevPos && prevQuat) {
        const pos = body.translation();
        const rot = body.rotation();

        const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        const currentQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

        mesh.position.lerpVectors(prevPos, currentPos, alpha);
        mesh.quaternion.slerpQuaternions(prevQuat, currentQuat, alpha);
      }
    }
  }

  dispose(): void {
    this.meshes.clear();
    this.previousPositions.clear();
    this.previousQuaternions.clear();
  }
}
