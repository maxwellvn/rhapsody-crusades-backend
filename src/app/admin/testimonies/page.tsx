import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import Testimony from '@/models/Testimony';
import User from '@/models/User';

async function updateTestimonyStatus(formData: FormData) {
  'use server';

  const testimonyId = formData.get('testimony_id') as string;
  const action = formData.get('action') as string;

  await connectDB();

  const status = action === 'approve' ? 'approved' : 'rejected';
  await Testimony.findByIdAndUpdate(testimonyId, { status });

  revalidatePath('/admin/testimonies');
}

export default async function AdminTestimonies() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  await connectDB();

  const testimonies = await Testimony.find().sort({ created_at: -1 });

  // Get user details
  const testimoniesWithUsers = await Promise.all(
    testimonies.map(async (testimony) => {
      const user = await User.findById(testimony.user_id).select('full_name');
      return {
        id: testimony._id.toHexString(),
        title: testimony.title,
        text: testimony.text,
        status: testimony.status,
        created_at: testimony.created_at,
        user_name: user?.full_name || 'Unknown User',
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Testimonies{' '}
          <span className="text-lg text-gray-500">({testimonies.length})</span>
        </h1>

        {/* Testimonies List */}
        <div className="space-y-4">
          {testimoniesWithUsers.map((testimony) => (
            <div
              key={testimony.id}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{testimony.title}</h3>
                  <p className="text-sm text-gray-500">
                    by {testimony.user_name} •{' '}
                    {new Date(testimony.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    testimony.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : testimony.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testimony.status}
                </span>
              </div>

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                {testimony.text.length > 300
                  ? `${testimony.text.substring(0, 300)}...`
                  : testimony.text}
              </p>

              {testimony.status === 'pending' && (
                <div className="flex space-x-2">
                  <form action={updateTestimonyStatus}>
                    <input type="hidden" name="testimony_id" value={testimony.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={updateTestimonyStatus}>
                    <input type="hidden" name="testimony_id" value={testimony.id} />
                    <input type="hidden" name="action" value="reject" />
                    <button
                      type="submit"
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}

          {testimonies.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No testimonies found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
