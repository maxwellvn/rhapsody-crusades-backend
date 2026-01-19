import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import AdminNav from '@/components/AdminNav';
import DeleteButton from '@/components/DeleteButton';
import TestimonyCategory from '@/models/TestimonyCategory';

// Preset icons for easy selection
const PRESET_ICONS = [
  { name: 'Healing', icon: 'medkit-outline', color: '#10B981' },
  { name: 'Salvation', icon: 'heart-outline', color: '#EF4444' },
  { name: 'Deliverance', icon: 'shield-checkmark-outline', color: '#8B5CF6' },
  { name: 'Financial', icon: 'cash-outline', color: '#F59E0B' },
  { name: 'Family', icon: 'people-outline', color: '#3B82F6' },
  { name: 'Career', icon: 'briefcase-outline', color: '#6366F1' },
  { name: 'Education', icon: 'school-outline', color: '#14B8A6' },
  { name: 'Marriage', icon: 'heart-circle-outline', color: '#EC4899' },
  { name: 'Protection', icon: 'shield-outline', color: '#64748B' },
  { name: 'Miracle', icon: 'star-outline', color: '#FBBF24' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' },
];

async function createCategory(formData: FormData) {
  'use server';

  const name = formData.get('name') as string;
  const preset = formData.get('preset') as string;
  const description = formData.get('description') as string;
  const customIcon = formData.get('customIcon') as string;
  const customColor = formData.get('customColor') as string;

  await connectDB();

  // Get preset or custom values
  let icon = 'star-outline';
  let color = '#007bff';

  if (preset && preset !== 'custom') {
    const presetData = PRESET_ICONS.find((p) => p.name === preset);
    if (presetData) {
      icon = presetData.icon;
      color = presetData.color;
    }
  } else {
    icon = customIcon || 'star-outline';
    color = customColor || '#007bff';
  }

  // Get next ID
  const lastCategory = await TestimonyCategory.findOne().sort({ id: -1 });
  const newId = lastCategory ? lastCategory.id + 1 : 1;

  // Get next order
  const lastOrder = await TestimonyCategory.findOne().sort({ order: -1 });
  const newOrder = lastOrder ? lastOrder.order + 1 : 0;

  await TestimonyCategory.create({
    id: newId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    description,
    icon,
    color,
    order: newOrder,
    active: true,
  });

  revalidatePath('/admin/testimony-categories');
}

async function deleteCategory(formData: FormData) {
  'use server';

  const id = parseInt(formData.get('id') as string, 10);

  await connectDB();
  await TestimonyCategory.deleteOne({ id });

  revalidatePath('/admin/testimony-categories');
}

async function toggleCategory(formData: FormData) {
  'use server';

  const id = parseInt(formData.get('id') as string, 10);

  await connectDB();
  const category = await TestimonyCategory.findOne({ id });
  if (category) {
    category.active = !category.active;
    await category.save();
  }

  revalidatePath('/admin/testimony-categories');
}

export default async function AdminTestimonyCategories() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  await connectDB();

  const categories = await TestimonyCategory.find().sort({ order: 1 });

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav adminName={session.name} />

      <main className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Testimony Categories
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Category Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
            <form action={createCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Healing, Salvation, Miracle"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a Preset (or scroll down for custom)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ICONS.map((preset) => (
                    <label
                      key={preset.name}
                      className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="preset"
                        value={preset.name}
                        defaultChecked={preset.name === 'Miracle'}
                        className="mr-2"
                      />
                      <span
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </label>
                  ))}
                  <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 border-dashed">
                    <input
                      type="radio"
                      name="preset"
                      value="custom"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-500">Custom...</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-3">
                  Custom options (only used if &quot;Custom&quot; is selected above):
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon Name
                    </label>
                    <input
                      type="text"
                      name="customIcon"
                      placeholder="star-outline"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Ionicons name
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      name="customColor"
                      defaultValue="#007bff"
                      className="w-full h-10 border rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Brief description of this category..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium"
              >
                Add Category
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Existing Categories ({categories.length})
            </h2>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    !category.active ? 'opacity-50 bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-gray-500">
                        {category.icon} | Order: {category.order}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <form action={toggleCategory}>
                      <input type="hidden" name="id" value={category.id} />
                      <button
                        type="submit"
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          category.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category.active ? 'Active' : 'Inactive'}
                      </button>
                    </form>
                    <DeleteButton
                      action={deleteCategory}
                      itemId={String(category.id)}
                      itemName={category.name}
                      confirmMessage="Delete this category?"
                      className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                    />
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No categories yet. Add your first one above!
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
