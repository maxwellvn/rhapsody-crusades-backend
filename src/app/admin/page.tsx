import { redirect } from 'next/navigation';
import connectDB from '@/lib/db';
import { getAdminSession, getOrCreateDefaultAdmin } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import Testimony from '@/models/Testimony';

export default async function AdminDashboard() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  await connectDB();
  await getOrCreateDefaultAdmin();

  // Get statistics
  const [
    totalUsers,
    totalTickets,
    activeTickets,
    usedTickets,
    totalTestimonies,
    pendingTestimonies,
    totalEvents,
  ] = await Promise.all([
    User.countDocuments(),
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: 'active' }),
    Ticket.countDocuments({ status: 'used' }),
    Testimony.countDocuments(),
    Testimony.countDocuments({ status: 'pending' }),
    Event.countDocuments(),
  ]);

  // Get recent users
  const recentUsers = await User.find()
    .select('full_name email country created_at')
    .sort({ created_at: -1 })
    .limit(5);

  // Get recent tickets
  const recentTickets = await Ticket.find()
    .sort({ created_at: -1 })
    .limit(5);

  // Get event and user names for tickets
  const ticketsWithDetails = await Promise.all(
    recentTickets.map(async (ticket) => {
      const [event, user] = await Promise.all([
        Event.findOne({ id: ticket.event_id }).select('title'),
        User.findById(ticket.user_id).select('full_name'),
      ]);
      return {
        id: ticket._id.toHexString(),
        status: ticket.status,
        event_title: event?.title || 'Unknown Event',
        user_name: user?.full_name || 'Unknown User',
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Tickets</h3>
            <p className="text-3xl font-bold text-green-600">{totalTickets}</p>
            <p className="text-sm text-gray-500">
              {activeTickets} active, {usedTickets} used
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Testimonies</h3>
            <p className="text-3xl font-bold text-purple-600">{totalTestimonies}</p>
            <p className="text-sm text-yellow-600">
              {pendingTestimonies} pending review
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
            <p className="text-3xl font-bold text-indigo-600">{totalEvents}</p>
          </div>
        </div>

        {/* Recent Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Users</h2>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user._id.toHexString()} className="border-t">
                      <td className="py-2">{user.full_name}</td>
                      <td className="py-2 text-gray-500">{user.email}</td>
                      <td className="py-2">{user.country}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Tickets</h2>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="pb-2">Event</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsWithDetails.map((ticket) => (
                    <tr key={ticket.id} className="border-t">
                      <td className="py-2">{ticket.event_title}</td>
                      <td className="py-2 text-gray-500">{ticket.user_name}</td>
                      <td className="py-2">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
