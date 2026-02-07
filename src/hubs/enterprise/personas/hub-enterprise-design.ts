/**
 * Hub Enterprise - DESIGN Persona (S-08)
 * UX/UI Designer: Wireframes, design systems, prototypes, accessibility
 * Usa Claude AI para design e análise de UX
 */

import { Skill, SkillInput, SkillOutput } from '../../skill-base';
import { getSkillRegistryV2 } from '../../registry-v2';
import {
  DesignSystem,
  AccessibilityIssue,
} from '../hub-enterprise-types';
import { createLogger } from '../shared/hub-enterprise-logger';

export class HubEnterpriseDesignSkill extends Skill {
  private registry = getSkillRegistryV2();
  private logger = createLogger('design');

  constructor() {
    super(
      {
        name: 'hub-enterprise-design',
        description: 'UX/UI Designer persona - Design systems and prototypes',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Hub Enterprise',
        tags: ['hub-enterprise', 'design', 'ux', 'ui', 'accessibility'],
      },
      {
        timeout: 300000, // 5 minutes
        retries: 2,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const subskill = input.params?.subskill;
    const appName = input.params?.appName;

    if (!subskill || !appName) {
      this.logger.error('Missing required parameters', {
        subskill,
        appName,
      });
      return false;
    }

    const validSubskills = [
      'create_wireframes',
      'design_system',
      'user_flows',
      'accessibility_audit',
      'prototype',
    ];

    if (!validSubskills.includes(subskill)) {
      this.logger.error('Invalid subskill', { subskill });
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { subskill, appName, ...params } = input.params || {};

    this.logger.info('Executing Design subskill', { subskill, appName });

    const startTime = Date.now();

    try {
      let result;

      switch (subskill) {
        case 'create_wireframes':
          result = await this.createWireframes(appName, params);
          break;
        case 'design_system':
          result = await this.designSystem(appName, params);
          break;
        case 'user_flows':
          result = await this.userFlows(appName, params);
          break;
        case 'accessibility_audit':
          result = await this.accessibilityAudit(appName, params);
          break;
        case 'prototype':
          result = await this.prototype(appName, params);
          break;
        default:
          return this.error(`Unknown subskill: ${subskill}`);
      }

      const duration = Date.now() - startTime;

      this.logger.info(`Subskill ${subskill} completed`, { duration });

      return this.success(result, { duration });
    } catch (error) {
      this.logger.error(`Subskill ${subskill} failed`, { error });
      return this.error(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * S08-1: Create Wireframes
   * Figma wireframes for key screens
   */
  private async createWireframes(
    appName: string,
    params: any
  ): Promise<{ wireframes: any; figmaUrl: string }> {
    const screens = params.screens || [
      'Landing',
      'Login',
      'Dashboard',
      'Profile',
    ];
    const style = params.style || 'modern-minimalist';

    const prompt = `
Create wireframes for "${appName}":

Screens: ${screens.join(', ')}
Style: ${style}
Target Device: ${params.device || 'desktop and mobile'}
Framework: ${params.framework || 'React'}

For each screen, define:
1. Layout structure
2. Key components (header, nav, content, footer)
3. User interactions
4. Navigation flow
5. Responsive breakpoints
6. Call-to-action placements

Return JSON:
{
  "wireframes": {
    "figmaUrl": "https://figma.com/file/${appName}-wireframes",
    "pages": [
      {
        "name": "Landing Page",
        "sections": ["hero", "features", "testimonials", "cta", "footer"],
        "components": ["Navbar", "Hero", "FeatureGrid", "CTAButton"],
        "interactions": ["scroll_animation", "hover_effects", "click_cta"]
      },
      {
        "name": "Dashboard",
        "sections": ["sidebar", "header", "content", "widgets"],
        "components": ["Sidebar", "StatsCards", "DataTable", "Charts"],
        "interactions": ["filter_data", "sort_table", "export_csv"]
      }
    ],
    "components": [
      "Button",
      "Input",
      "Card",
      "Modal",
      "Table",
      "Chart"
    ],
    "version": "1.0"
  },
  "figmaUrl": "https://figma.com/file/${appName}-wireframes"
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a UX designer creating wireframes.
Design intuitive, user-friendly interfaces. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        wireframes: parsed.wireframes,
        figmaUrl: parsed.figmaUrl || `https://figma.com/file/${appName}`,
      };
    } catch (error) {
      this.logger.error('Failed to parse wireframes', { error });
      throw error;
    }
  }

  /**
   * S08-2: Design System
   * Component library and design tokens
   */
  private async designSystem(
    appName: string,
    params: any
  ): Promise<DesignSystem> {
    const brand = params.brand || {};
    const framework = params.framework || 'React + TailwindCSS';

    const prompt = `
Create design system for "${appName}":

Brand: ${brand.name || appName}
Framework: ${framework}
Style: ${params.style || 'modern, professional'}

Design system should include:
1. Color palette (primary, secondary, neutrals, semantic)
2. Typography scale
3. Spacing system
4. Border radius scale
5. Shadow system
6. Component library
7. Design tokens

Return JSON:
{
  "wireframes": {
    "figmaUrl": "https://figma.com/file/${appName}-design-system",
    "pages": ["Colors", "Typography", "Components", "Patterns"],
    "components": [
      "Button",
      "Input",
      "Card",
      "Modal",
      "Dropdown",
      "Table",
      "Form"
    ],
    "version": "1.0.0"
  },
  "designSystem": {
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#8B5CF6",
      "success": "#10B981",
      "warning": "#F59E0B",
      "error": "#EF4444",
      "neutral-50": "#F9FAFB",
      "neutral-900": "#111827"
    },
    "typography": {
      "font-family": "Inter, system-ui, sans-serif",
      "heading-xl": "3rem / 1.2 / 700",
      "heading-lg": "2.25rem / 1.3 / 700",
      "body-lg": "1.125rem / 1.5 / 400",
      "body-md": "1rem / 1.5 / 400"
    },
    "spacing": [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
    "borderRadius": [0, 4, 8, 12, 16, 24, 9999],
    "shadows": [
      "none",
      "0 1px 2px rgba(0,0,0,0.05)",
      "0 4px 6px rgba(0,0,0,0.1)",
      "0 10px 15px rgba(0,0,0,0.1)"
    ]
  },
  "accessibility": {
    "wcagLevel": "AA",
    "score": 92,
    "issues": []
  }
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a design systems specialist.
Create consistent, scalable design systems. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        wireframes: parsed.wireframes,
        designSystem: parsed.designSystem,
        accessibility: parsed.accessibility,
      };
    } catch (error) {
      this.logger.error('Failed to parse design system', { error });
      throw error;
    }
  }

  /**
   * S08-3: User Flows
   * User journey mapping
   */
  private async userFlows(
    appName: string,
    params: any
  ): Promise<{ flows: any[]; personas: any[] }> {
    const features = params.features || ['signup', 'onboarding', 'purchase'];

    const prompt = `
Map user flows for "${appName}":

Features: ${features.join(', ')}
User Types: ${params.userTypes || 'new user, returning user, admin'}

For each flow, define:
1. Entry point
2. Steps and decision points
3. Success state
4. Error states
5. Exit points
6. Pain points and optimizations

Return JSON:
{
  "flows": [
    {
      "name": "User Signup",
      "persona": "New User",
      "steps": [
        {
          "step": 1,
          "screen": "Landing Page",
          "action": "Click 'Sign Up' button",
          "nextStep": 2
        },
        {
          "step": 2,
          "screen": "Signup Form",
          "action": "Fill email and password",
          "validation": "Email format, password strength",
          "nextStep": 3,
          "errorPath": "Show validation errors"
        },
        {
          "step": 3,
          "screen": "Email Verification",
          "action": "Click verification link",
          "nextStep": 4
        },
        {
          "step": 4,
          "screen": "Dashboard",
          "action": "Success - user logged in",
          "nextStep": "end"
        }
      ],
      "successRate": 0.65,
      "dropoffPoints": ["Step 2 (25%)", "Step 3 (10%)"],
      "optimizations": [
        "Add social login options",
        "Simplify form to 2 fields only",
        "Reduce email verification friction"
      ]
    }
  ],
  "personas": [
    {
      "name": "New User",
      "goals": ["Quick signup", "Understand product value"],
      "painPoints": ["Complex forms", "Too many steps"],
      "preferences": ["Mobile-friendly", "Social login"]
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a UX researcher mapping user journeys.
Identify pain points and optimization opportunities. Output valid JSON only.`,
        maxTokens: 2500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        flows: parsed.flows || [],
        personas: parsed.personas || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse user flows', { error });
      throw error;
    }
  }

  /**
   * S08-4: Accessibility Audit
   * WCAG compliance review
   */
  private async accessibilityAudit(
    appName: string,
    params: any
  ): Promise<{ wcagLevel: string; score: number; issues: AccessibilityIssue[] }> {
    const targetLevel = params.targetLevel || 'AA';
    const pages = params.pages || ['/'];

    const prompt = `
Perform accessibility audit for "${appName}":

Target WCAG Level: ${targetLevel}
Pages: ${pages.join(', ')}
Framework: ${params.framework || 'React'}

Check for:
1. Color contrast (4.5:1 for text, 3:1 for UI)
2. Keyboard navigation
3. Screen reader support (ARIA labels)
4. Focus indicators
5. Form labels and error messages
6. Alt text for images
7. Semantic HTML
8. Skip navigation links
9. Accessible modals and dropdowns
10. Video captions

Return JSON:
{
  "wcagLevel": "AA",
  "score": 85,
  "issues": [
    {
      "type": "Color Contrast",
      "severity": "major",
      "element": "button.secondary",
      "recommendation": "Increase contrast from 3.2:1 to 4.5:1. Change background from #E5E7EB to #D1D5DB"
    },
    {
      "type": "Missing ARIA label",
      "severity": "critical",
      "element": "nav > button.menu-toggle",
      "recommendation": "Add aria-label='Toggle navigation menu'"
    },
    {
      "type": "Keyboard Navigation",
      "severity": "major",
      "element": "Modal component",
      "recommendation": "Trap focus within modal and add Escape key handler"
    },
    {
      "type": "Missing alt text",
      "severity": "critical",
      "element": "img.product-image",
      "recommendation": "Add descriptive alt text for all product images"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are an accessibility specialist auditing WCAG compliance.
Identify issues with clear, actionable remediation steps. Output valid JSON only.`,
        maxTokens: 2000,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        wcagLevel: parsed.wcagLevel,
        score: parsed.score,
        issues: parsed.issues || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse accessibility audit', { error });
      throw error;
    }
  }

  /**
   * S08-5: Prototype
   * Interactive prototype
   */
  private async prototype(
    appName: string,
    params: any
  ): Promise<{ prototype: any; interactions: any[] }> {
    const features = params.features || ['core user flow'];
    const fidelity = params.fidelity || 'high-fidelity';

    const prompt = `
Create interactive prototype for "${appName}":

Features: ${features.join(', ')}
Fidelity: ${fidelity}
Tool: ${params.tool || 'Figma'}
Interactions: ${params.interactions || 'clicks, hovers, transitions'}

Prototype should include:
1. Key user flows
2. Interactive components
3. Transitions and animations
4. Micro-interactions
5. Responsive behavior
6. User testing notes

Return JSON:
{
  "prototype": {
    "url": "https://figma.com/proto/${appName}",
    "tool": "Figma",
    "fidelity": "${fidelity}",
    "screens": 12,
    "flows": [
      "Signup flow",
      "Main dashboard navigation",
      "Feature usage"
    ],
    "version": "1.0",
    "notes": "Ready for user testing"
  },
  "interactions": [
    {
      "component": "Primary Button",
      "trigger": "click",
      "action": "Navigate to next screen",
      "animation": "fade",
      "duration": "300ms"
    },
    {
      "component": "Card",
      "trigger": "hover",
      "action": "Show shadow and lift",
      "animation": "ease-out",
      "duration": "200ms"
    },
    {
      "component": "Modal",
      "trigger": "click overlay",
      "action": "Close modal",
      "animation": "scale-down",
      "duration": "250ms"
    }
  ]
}
`;

    const aiResult = await this.registry.execute('ai.claude', {
      skillId: 'ai.claude',
      params: {
        prompt,
        systemPrompt: `You are a UX designer creating interactive prototypes.
Design polished, realistic prototypes for user testing. Output valid JSON only.`,
        maxTokens: 1500,
      },
    });

    if (!aiResult.success) {
      throw new Error(`AI call failed: ${aiResult.error}`);
    }

    try {
      let jsonText = aiResult.data?.content || String(aiResult.data);
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText);

      return {
        prototype: parsed.prototype,
        interactions: parsed.interactions || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse prototype', { error });
      throw error;
    }
  }
}

export function createHubEnterpriseDesignSkill(): HubEnterpriseDesignSkill {
  return new HubEnterpriseDesignSkill();
}
