import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import DeleteButton from '@/components/DeleteButton';
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import Testimony from '@/models/Testimony';

interface PageProps {
  searchParams: Promise<{ search?: string; edit?: string; create?: string }>;
}

async function updateUser(formData: FormData) {
  'use server';

  const userId = formData.get('userId') as string;
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const country = formData.get('country') as string;
  const city = formData.get('city') as string;
  const church = formData.get('church') as string;
  const zone = formData.get('zone') as string;

  await connectDB();

  await User.findByIdAndUpdate(userId, {
    full_name,
    email,
    phone: phone || undefined,
    country,
    city: city || undefined,
    church: church || undefined,
    zone: zone || undefined,
  });

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

async function deleteUser(formData: FormData) {
  'use server';

  const userId = formData.get('id') as string;

  await connectDB();

  // Delete user and their related data
  await Promise.all([
    User.findByIdAndDelete(userId),
    Ticket.deleteMany({ user_id: userId }),
    Testimony.deleteMany({ user_id: userId }),
  ]);

  revalidatePath('/admin/users');
}

async function createUser(formData: FormData) {
  'use server';

  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const country = formData.get('country') as string;
  const phone = formData.get('phone') as string;
  const city = formData.get('city') as string;
  const church = formData.get('church') as string;
  const zone = formData.get('zone') as string;

  await connectDB();

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    // User already exists, redirect back with error
    redirect('/admin/users?create=1&error=email_exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  await User.create({
    full_name,
    email: email.toLowerCase(),
    password: hashedPassword,
    country,
    phone: phone || undefined,
    city: city || undefined,
    church: church || undefined,
    zone: zone || undefined,
  });

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export default async function AdminUsers({ searchParams }: PageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const search = params.search || '';
  const editUserId = params.edit || '';
  const showCreateModal = params.create === '1';

  await connectDB();

  // Build query
  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { full_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { country: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ created_at: -1 });

  // Get user being edited
  const editingUser = editUserId
    ? await User.findById(editUserId).select('-password')
    : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Users <span className="text-lg text-gray-500">({users.length})</span>
          </h1>
          <a
            href="/admin/users?create=1"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            + Add User
          </a>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Edit User</h2>
                  <a
                    href="/admin/users"
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </a>
                </div>
                <form action={updateUser} className="space-y-4">
                  <input type="hidden" name="userId" value={editingUser._id.toHexString()} />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      defaultValue={editingUser.full_name}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingUser.email}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={editingUser.phone || ''}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        name="country"
                        defaultValue={editingUser.country}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        defaultValue={editingUser.city || ''}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Church
                      </label>
                      <input
                        type="text"
                        name="church"
                        defaultValue={editingUser.church || ''}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone
                      </label>
                      <input
                        type="text"
                        name="zone"
                        defaultValue={editingUser.zone || ''}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      Save Changes
                    </button>
                    <a
                      href="/admin/users"
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium text-center"
                    >
                      Cancel
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Create New User</h2>
                  <a
                    href="/admin/users"
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </a>
                </div>
                <form action={createUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      required
                      placeholder="Nigeria"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="+234..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        placeholder="Lagos"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone
                      </label>
                      <input
                        type="text"
                        name="zone"
                        placeholder="Zone A"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Church
                    </label>
                    <input
                      type="text"
                      name="church"
                      placeholder="Christ Embassy"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      Create User
                    </button>
                    <a
                      href="/admin/users"
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium text-center"
                    >
                      Cancel
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <form className="mb-6">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, email, or country..."
            className="w-full md:w-96 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Church
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id.toHexString()} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {user.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      {user.full_name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.country || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {user.church || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/admin/users?edit=${user._id.toHexString()}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                      >
                        Edit
                      </a>
                      <DeleteButton
                        action={deleteUser}
                        itemId={user._id.toHexString()}
                        itemName={user.full_name}
                        confirmMessage={`Delete ${user.full_name || 'this user'}? This will also delete their tickets and testimonies.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No users found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
