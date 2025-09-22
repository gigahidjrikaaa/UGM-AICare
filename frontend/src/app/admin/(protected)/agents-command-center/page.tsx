import { Metadata } from 'next';
import AgentsCommandCenterClient from './AgentsCommandCenterClient';

export const metadata: Metadata = {
  title: 'Admin: Agents Command Center',
};

export default function AgentsCommandCenterPage() {
  return <AgentsCommandCenterClient />;
}
