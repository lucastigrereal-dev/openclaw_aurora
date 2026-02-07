/**
 * OpenClaw Registry Loader
 *
 * Provides typed access to the canonical registry JSON.
 * This is the single source of truth for all hubs, skills, and workflows.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface RegistryMeta {
  name: string;
  description: string;
  maintainer?: string;
  repository?: string;
}

export interface RegistryStatistics {
  total_hubs: number;
  total_skills: number;
  total_workflows: number;
  by_category: Record<string, number>;
}

export interface RegistrySkill {
  id: string;
  name: string;
  display_name?: string;
  role?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  domain?: string;
  tier?: 'basic' | 'enterprise';
  description: string;
  category: 'UTIL' | 'EXEC' | 'NET' | 'DATA';
  capabilities?: string[];
  risk: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

export interface RegistryWorkflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  estimated_duration_ms?: number;
  requires_confirmation?: boolean;
  input_schema?: Record<string, unknown>;
}

export interface RegistryHub {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'development' | 'data' | 'content' | 'integration' | 'security' | 'operations';
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  adapter: string;
  adapter_path?: string;
  capabilities?: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  skills: RegistrySkill[];
  workflows: RegistryWorkflow[];
}

export interface OpenClawRegistry {
  $schema?: string;
  version: string;
  generated_at?: string;
  meta: RegistryMeta;
  statistics: RegistryStatistics;
  hubs: Record<string, RegistryHub>;
}

// ============================================================================
// Loader
// ============================================================================

let cachedRegistry: OpenClawRegistry | null = null;

/**
 * Load the OpenClaw registry from the JSON file
 */
export function loadRegistry(reload = false): OpenClawRegistry {
  if (cachedRegistry && !reload) {
    return cachedRegistry;
  }

  const registryPath = join(__dirname, 'openclaw-registry.json');

  if (!existsSync(registryPath)) {
    throw new Error(`Registry not found at ${registryPath}`);
  }

  const content = readFileSync(registryPath, 'utf-8');
  cachedRegistry = JSON.parse(content) as OpenClawRegistry;

  return cachedRegistry;
}

/**
 * Get all hubs from the registry
 */
export function getHubs(): RegistryHub[] {
  const registry = loadRegistry();
  return Object.values(registry.hubs);
}

/**
 * Get a specific hub by ID
 */
export function getHub(hubId: string): RegistryHub | undefined {
  const registry = loadRegistry();
  return registry.hubs[hubId];
}

/**
 * Get all skills across all hubs
 */
export function getAllSkills(): Array<RegistrySkill & { hub_id: string }> {
  const registry = loadRegistry();
  const skills: Array<RegistrySkill & { hub_id: string }> = [];

  for (const [hubId, hub] of Object.entries(registry.hubs)) {
    for (const skill of hub.skills) {
      skills.push({ ...skill, hub_id: hubId });
    }
  }

  return skills;
}

/**
 * Get skills for a specific hub
 */
export function getHubSkills(hubId: string): RegistrySkill[] {
  const hub = getHub(hubId);
  return hub?.skills ?? [];
}

/**
 * Get all workflows across all hubs
 */
export function getAllWorkflows(): Array<RegistryWorkflow & { hub_id: string }> {
  const registry = loadRegistry();
  const workflows: Array<RegistryWorkflow & { hub_id: string }> = [];

  for (const [hubId, hub] of Object.entries(registry.hubs)) {
    for (const workflow of hub.workflows) {
      workflows.push({ ...workflow, hub_id: hubId });
    }
  }

  return workflows;
}

/**
 * Get workflows for a specific hub
 */
export function getHubWorkflows(hubId: string): RegistryWorkflow[] {
  const hub = getHub(hubId);
  return hub?.workflows ?? [];
}

/**
 * Find a skill by name across all hubs
 */
export function findSkill(skillName: string): (RegistrySkill & { hub_id: string }) | undefined {
  const allSkills = getAllSkills();
  return allSkills.find(s => s.name === skillName || s.id === skillName);
}

/**
 * Find a workflow by ID across all hubs
 */
export function findWorkflow(workflowId: string): (RegistryWorkflow & { hub_id: string }) | undefined {
  const allWorkflows = getAllWorkflows();
  return allWorkflows.find(w => w.id === workflowId);
}

/**
 * Get registry statistics
 */
export function getStatistics(): RegistryStatistics {
  const registry = loadRegistry();
  return registry.statistics;
}

/**
 * Search skills by tag
 */
export function searchSkillsByTag(tag: string): Array<RegistrySkill & { hub_id: string }> {
  const allSkills = getAllSkills();
  return allSkills.filter(s => s.tags?.includes(tag));
}

/**
 * Search skills by capability
 */
export function searchSkillsByCapability(capability: string): Array<RegistrySkill & { hub_id: string }> {
  const allSkills = getAllSkills();
  return allSkills.filter(s => s.capabilities?.includes(capability));
}

/**
 * Get high-risk workflows that require confirmation
 */
export function getHighRiskWorkflows(): Array<RegistryWorkflow & { hub_id: string }> {
  const allWorkflows = getAllWorkflows();
  return allWorkflows.filter(w => w.risk_level === 'high' || w.risk_level === 'critical');
}

/**
 * Validate that all workflow steps reference valid skills
 */
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const registry = loadRegistry();
  const errors: string[] = [];

  for (const [hubId, hub] of Object.entries(registry.hubs)) {
    const skillIds = new Set(hub.skills.map(s => s.id));

    for (const workflow of hub.workflows) {
      for (const stepId of workflow.steps) {
        if (!skillIds.has(stepId)) {
          errors.push(`Hub '${hubId}': Workflow '${workflow.id}' references unknown skill '${stepId}'`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Export registry data for quick access
// ============================================================================

export const REGISTRY_PATH = join(__dirname, 'openclaw-registry.json');

// Re-export everything
export default {
  loadRegistry,
  getHubs,
  getHub,
  getAllSkills,
  getHubSkills,
  getAllWorkflows,
  getHubWorkflows,
  findSkill,
  findWorkflow,
  getStatistics,
  searchSkillsByTag,
  searchSkillsByCapability,
  getHighRiskWorkflows,
  validateRegistry,
  REGISTRY_PATH,
};
