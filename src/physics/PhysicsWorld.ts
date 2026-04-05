import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsWorld {
  public world: RAPIER.World;

  constructor() {
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  async initialize(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  step(): void {
    this.world.step();
  }

  createRigidBody(desc: RAPIER.RigidBodyDesc): RAPIER.RigidBody {
    return this.world.createRigidBody(desc);
  }

  createCollider(
    desc: RAPIER.ColliderDesc,
    body: RAPIER.RigidBody,
  ): RAPIER.Collider {
    return this.world.createCollider(desc, body);
  }

  removeRigidBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  getCollisionPairs(): any[] {
    return [];
  }

  dispose(): void {}
}
