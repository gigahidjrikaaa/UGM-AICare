"use client";

import React, { useState, useEffect } from 'react';
import { getPsychologists, getAppointmentTypes, createAppointment } from '@/services/api';
import { Psychologist, AppointmentType, AppointmentCreate } from '@/types/api';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

const AppointmentPage: React.FC = () => {
  const { data: session } = useSession();
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<number | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<number | null>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const psychs = await getPsychologists();
        setPsychologists(psychs);

        const types = await getAppointmentTypes();
        setAppointmentTypes(types);
      } catch (error) {
        toast.error('Failed to load data.');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.google_sub) {
      toast.error('User not authenticated.');
      return;
    }
    if (!selectedPsychologist || !selectedAppointmentType || !appointmentDateTime) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AppointmentCreate = {
        user_identifier: session.user.google_sub,
        psychologist_id: selectedPsychologist,
        appointment_type_id: selectedAppointmentType,
        appointment_datetime: new Date(appointmentDateTime).toISOString(),
        notes,
      };
      await createAppointment(payload);
      toast.success('Appointment created successfully!');
      // Clear form
      setSelectedPsychologist(null);
      setSelectedAppointmentType(null);
      setAppointmentDateTime('');
      setNotes('');
    } catch (error) {
      toast.error('Failed to create appointment.');
      console.error('Error creating appointment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading appointment options...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Book a Psychologist Appointment</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="psychologist" className="block text-sm font-medium text-gray-700">Select Psychologist:</label>
          <select
            id="psychologist"
            value={selectedPsychologist || ''}
            onChange={(e) => setSelectedPsychologist(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            required
          >
            <option value="">-- Select a Psychologist --</option>
            {psychologists.map((psych) => (
              <option key={psych.id} value={psych.id}>
                {psych.name} ({psych.specialization})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700">Select Appointment Type:</label>
          <select
            id="appointmentType"
            value={selectedAppointmentType || ''}
            onChange={(e) => setSelectedAppointmentType(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            required
          >
            <option value="">-- Select an Appointment Type --</option>
            {appointmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.duration_minutes} minutes)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700">Appointment Date and Time:</label>
          <input
            type="datetime-local"
            id="dateTime"
            value={appointmentDateTime}
            onChange={(e) => setAppointmentDateTime(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional):</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
};

export default AppointmentPage;
