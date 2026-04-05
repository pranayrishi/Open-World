import RAPIER from "@dimforge/rapier3d-compat";

export class ColliderFactory {
  static createTerrainCollider(
    heights: Float32Array,
    resolution: number,
    scale: { x: number; y: number; z: number },
  ): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.heightfield(
      resolution,
      resolution,
      heights,
      scale,
    );
  }

  static createPlayerCollider(
    halfHeight: number,
    radius: number,
  ): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.capsule(halfHeight, radius).setActiveEvents(
      RAPIER.ActiveEvents.COLLISION_EVENTS,
    );
  }

  static createNPCCapsule(
    halfHeight: number,
    radius: number,
  ): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(
      0x00010001,
    );
  }

  static createRockCollider(radius: number): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.ball(radius);
  }

  static createBoxCollider(halfExtents: {
    x: number;
    y: number;
    z: number;
  }): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    );
  }

  static createWaterSensor(): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.cuboid(50, 1, 50).setSensor(true);
  }
}
