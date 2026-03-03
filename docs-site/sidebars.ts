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
        'research/problem-statement',
        'research/methodology',
        'research/evaluation',
        'research/ethics',
      ],
    },
    {
      type: 'category',
      label: 'Multi-Agent Architecture',
      collapsed: false,
      items: [
        'architecture/system-overview',
        'architecture/agentic-framework',
        'architecture/meta-agent-aika',
        'architecture/safety-triage-agent',
        'architecture/therapeutic-coach-agent',
        'architecture/case-management-agent',
        'architecture/insights-agent',
      ],
    },
    {
      type: 'category',
      label: 'Passive Screening & Safeguards',
      collapsed: true,
      items: [
        'passive-screening/methodology',
        'passive-screening/validated-instruments',
        'passive-screening/data-safety',
      ],
    },
    {
      type: 'category',
      label: 'Aika Autopilot & MLOps',
      collapsed: true,
      items: [
        'aika-autopilot/policy-governed-autonomy',
        'aika-autopilot/implementation-plan',
      ],
    },
    {
      type: 'category',
      label: 'Care Token & Blockchain',
      collapsed: true,
      items: [
        'care-token/tokenomics',
        'care-token/smart-contracts',
        'care-token/wallet-integration',
      ],
    },
    {
      type: 'category',
      label: 'Analytics & Data Privacy',
      collapsed: true,
      items: [
        'analytics/privacy-first-data',
        'analytics/database-best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Engineering',
      collapsed: true,
      items: [
        'engineering/tech-stack',
        'engineering/development-workflow',
        'engineering/api-reference',
        'engineering/frontend-overview',
      ],
    },
    {
      type: 'category',
      label: 'Deployment & Operations',
      collapsed: true,
      items: [
        'deployment/infrastructure-map',
        'deployment/ci-cd-flow',
        'deployment/monitoring',
        'deployment/setup',
      ],
    },
  ],
};

export default sidebars;
