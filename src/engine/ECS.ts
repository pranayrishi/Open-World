import * as THREE from "three";

export interface TransformComponent {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
}

export interface MeshComponent {
  mesh: THREE.Object3D;
}

export interface PhysicsComponent {
  rigidBody: any;
  collider: any;
}

export interface AnimationComponent {
  mixer: THREE.AnimationMixer;
  currentAction: string;
}

export interface NPCComponent {
  behaviorState: string;
  waypoints: THREE.Vector3[];
  speed: number;
}

export interface BiomeComponent {
  type: "forest" | "desert" | "snow";
  blendFactor: number;
}

export interface VegetationComponent {
  type: string;
  lodLevel: number;
}

type ComponentType =
  | TransformComponent
  | MeshComponent
  | PhysicsComponent
  | AnimationComponent
  | NPCComponent
  | BiomeComponent
  | VegetationComponent;

export class World {
  private nextEntity = 1;
  private components: Map<number, Map<string, ComponentType>> = new Map();

  createEntity(): number {
    const id = this.nextEntity++;
    this.components.set(id, new Map());
    return id;
  }

  addComponent<T extends ComponentType>(
    entity: number,
    componentType: string,
    component: T,
  ): void {
    const entityComponents = this.components.get(entity);
    if (entityComponents) {
      entityComponents.set(componentType, component);
    }
  }

  getComponent<T extends ComponentType>(
    entity: number,
    componentType: string,
  ): T | undefined {
    const entityComponents = this.components.get(entity);
    return entityComponents?.get(componentType) as T | undefined;
  }

  hasComponent(entity: number, componentType: string): boolean {
    const entityComponents = this.components.get(entity);
    return entityComponents?.has(componentType) ?? false;
  }

  getEntitiesWith(...componentTypes: string[]): number[] {
    const result: number[] = [];
    for (const [entity, components] of this.components) {
      const hasAll = componentTypes.every((type) => components.has(type));
      if (hasAll) {
        result.push(entity);
      }
    }
    return result;
  }

  removeEntity(entity: number): void {
    this.components.delete(entity);
  }

  removeComponent(entity: number, componentType: string): void {
    const entityComponents = this.components.get(entity);
    entityComponents?.delete(componentType);
  }

  clear(): void {
    this.components.clear();
    this.nextEntity = 1;
  }

  getEntityCount(): number {
    return this.components.size;
  }
}

export abstract class System {
  protected world: World;

  constructor(world: World) {
    this.world = world;
  }

  abstract update(deltaTime: number): void;
}
