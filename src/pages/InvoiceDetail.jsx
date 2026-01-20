import { useParams } from 'react-router-dom';

export default function InvoiceDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Invoice #{id}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Invoice details will be displayed here.</p>
      </div>
    </div>
  );
}
