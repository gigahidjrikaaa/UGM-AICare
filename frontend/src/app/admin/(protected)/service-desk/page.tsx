import { Metadata } from 'next';
import ServiceDeskClient from './ServiceDeskClient';

export const metadata: Metadata = {
  title: 'Service Desk | UGM-AICare Admin',
  description: 'Manage clinical cases with automatic SLA calculation and counselor assignment',
};

export default function ServiceDeskPage() {
  return <ServiceDeskClient />;
}
