import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Research & Thesis',
      collapsed: false,
      items: [
        'research/problem-and-methodology',
        'research/evaluation-framework',
        'research/psychological-methods',
      ],
    },
    {
      type: 'category',
      label: 'Multi-Agent Architecture',
      collapsed: false,
      items: [
        'architecture/system-overview',
        'architecture/agentic-framework',
        'architecture/requirements-and-flows',
        'architecture/data-and-security',
        'architecture/meta-agent-aika',
        'architecture/safety-triage-agent',
        'architecture/therapeutic-coach-agent',
        'architecture/case-management-agent',
        'architecture/insights-agent',
      ],
    },
    {
      type: 'category',
      label: 'Covert Screening',
      collapsed: true,
      items: [
        'passive-screening/covert-screening',
      ],
    },
    {
      type: 'category',
      label: 'Aika Autopilot & MLOps',
      collapsed: true,
      items: [
        'aika-autopilot/autopilot-architecture',
        'aika-autopilot/implementation-plan',
      ],
    },
    {
      type: 'category',
      label: 'Privacy-Preserving Analytics',
      collapsed: true,
      items: [
        'analytics/privacy-and-analytics',
      ],
    },
    {
      type: 'category',
      label: 'Engineering',
      collapsed: true,
      items: [
        'engineering/tech-stack',
        'engineering/api-reference',
      ],
    },
    {
      type: 'category',
      label: 'Deployment & Operations',
      collapsed: true,
      items: [
        'deployment/setup',
        'deployment/ci-cd-and-monitoring',
      ],
    },
  ],
};

export default sidebars;
