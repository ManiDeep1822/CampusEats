import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const MenuManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category: '', isVeg: true, image: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/vendor/menu');
      setMenu(data);
    } catch (e) { toast.error('Failed to load menu'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMenu(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/vendor/menu/${editingId}`, formData);
        toast.success("Item updated");
      } else {
        await api.post('/vendor/menu', formData);
        toast.success("Item added");
      }
      setShowModal(false);
      setFormData({ name: '', description: '', price: '', category: '', isVeg: true, image: '' });
      setEditingId(null);
      fetchMenu();
      fetchMenu();
    } catch(err) { toast.error('Failed to save item'); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadData = new FormData();
    uploadData.append('image', file);
    
    const toastId = toast.loading('Uploading image...');
    try {
      const { data } = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, image: data.imageUrl });
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (err) {
      toast.error('Image upload failed', { id: toastId });
      console.error(err);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item._id);
    setShowModal(true);
  };

  const handleToggle = async (id) => {
    try {
      await api.put(`/vendor/menu/${id}/toggle`);
      toast.success("Stock status updated");
      fetchMenu();
    } catch (err) { toast.error("Toggle failed"); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/vendor/menu/${id}`);
      toast.success("Item deleted");
      fetchMenu();
    } catch(err) { toast.error("Deletion failed"); }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">Menu Management</h1>
          <button onClick={() => setShowModal(true)} className="bg-primary text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition"><FiPlus/> Add Item</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 border-b">
                <th className="p-4 font-bold">Item Name</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Price</th>
                <th className="p-4 font-bold text-center">Type</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menu.map(item => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-gray-50 transition">
                  <td className="p-4 flex items-center gap-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-12 w-12 object-cover rounded shadow-sm" />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs shadow-sm">No Img</div>
                    )}
                    <div>
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate w-48">{item.description}</div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{item.category}</td>
                  <td className="p-4 font-bold">₹{item.price}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.isVeg ? 'bg-green-100 text-accent' : 'bg-red-100 text-red-600'}`}>{item.isVeg ? 'VEG' : 'NON-VEG'}</span>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => handleToggle(item._id)} className={`p-2 rounded font-bold text-xs ${item.isAvailable !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                      {item.isAvailable !== false ? 'IN STOCK' : 'OUT OF STOCK'}
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded"><FiEdit2/></button>
                    <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded"><FiTrash2/></button>
                  </td>
                </tr>
              ))}
              {menu.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">No items available. Add some to get started!</td></tr>}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold font-heading mb-6">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Item Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded"/>
                <input type="number" placeholder="Price (₹)" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2 border rounded"/>
                <input type="text" placeholder="Category (e.g. Starters, Main Course)" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded"/>
                <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded h-20"/>
                
                <div className="w-full">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Item Image</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border rounded text-sm"/>
                  {formData.image && <img src={formData.image} alt="Preview" className="h-20 w-20 object-cover rounded mt-2 shadow"/>}
                </div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={formData.isVeg} onChange={e => setFormData({...formData, isVeg: e.target.checked})} className="accent-accent w-4 h-4"/>
                  <span>Vegetarian</span>
                </label>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {setShowModal(false); setEditingId(null); setFormData({name: '', description: '', price: '', category: '', isVeg: true, image: ''})}} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-bold hover:bg-gray-200">Cancel</button>
                  <button type="submit" className="flex-1 bg-primary text-white py-2 rounded font-bold hover:bg-orange-600">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MenuManagement;
