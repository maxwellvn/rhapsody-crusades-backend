import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import User from '@/models/User';

export default async function AdminTickets() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  await connectDB();

  const tickets = await Ticket.find().sort({ created_at: -1 }).limit(100);

  // Get event and user details
  const ticketsWithDetails = await Promise.all(
    tickets.map(async (ticket) => {
      const [event, user] = await Promise.all([
        Event.findOne({ id: ticket.event_id }).select('title'),
        User.findById(ticket.user_id).select('full_name email'),
      ]);
      return {
        id: ticket._id.toHexString(),
        qr_code: ticket.qr_code,
        status: ticket.status,
        registration_date: ticket.registration_date,
        event_title: event?.title || 'Unknown Event',
        user_name: user?.full_name || 'Unknown User',
        user_email: user?.email || '',
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Tickets <span className="text-lg text-gray-500">(Latest 100)</span>
        </h1>

        {/* Tickets Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  QR Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ticketsWithDetails.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{ticket.event_title}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div>{ticket.user_name}</div>
                      <div className="text-sm text-gray-500">
                        {ticket.user_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{ticket.qr_code}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        ticket.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'used'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {ticket.registration_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No tickets found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
