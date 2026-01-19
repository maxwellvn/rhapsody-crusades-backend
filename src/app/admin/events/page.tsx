import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';

export default async function AdminEvents() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  await connectDB();

  const events = await Event.find().sort({ date: -1 });

  // Get registration counts for each event
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      const [totalRegistrations, checkedIn] = await Promise.all([
        Ticket.countDocuments({ event_id: event.id }),
        Ticket.countDocuments({ event_id: event.id, status: 'used' }),
      ]);
      return {
        ...event.toJSON(),
        total_registrations: totalRegistrations,
        checked_in: checkedIn,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Events <span className="text-lg text-gray-500">({events.length})</span>
        </h1>

        {/* Events Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registrations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Checked In
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {eventsWithCounts.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-500">{event.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div>{event.date}</div>
                      {event.time && (
                        <div className="text-sm text-gray-500">{event.time}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div>{event.venue}</div>
                      {event.city && (
                        <div className="text-sm text-gray-500">
                          {event.city}, {event.country}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {event.total_registrations}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      {event.checked_in}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No events found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
