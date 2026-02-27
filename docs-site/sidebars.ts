import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '👋 Introduction',
    },
    {
      type: 'category',
      label: '🏗️ Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/agentic-framework',
        'architecture/tech-stack',
      ],
    },
    {
      type: 'category',
      label: '🤖 Agents',
      collapsed: false,
      items: [
        'agents/aika',
        'agents/sta',
        'agents/tca',
        'agents/cma',
        'agents/ia',
      ],
    },
    {
      type: 'category',
      label: '🔧 Backend',
      collapsed: true,
      items: [
        'backend/api-overview',
        'backend/database',
      ],
    },
    {
      type: 'category',
      label: '🖥️ Frontend',
      collapsed: true,
      items: [
        'frontend/overview',
      ],
    },
    {
      type: 'category',
      label: '🚀 Deployment',
      collapsed: true,
      items: [
        'deployment/setup',
      ],
    },
  ],
};

export default sidebars;
