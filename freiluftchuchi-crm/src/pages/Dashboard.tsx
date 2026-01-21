export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Einnahmen</h3>
          <p className="text-2xl font-bold text-green-600">447.00 CHF</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Ausgaben</h3>
          <p className="text-2xl font-bold text-red-600">683.91 CHF</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Profit</h3>
          <p className="text-2xl font-bold text-blue-600">-216.91 CHF</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Willkommen im CRM-System</h2>
        <p className="text-gray-600">
          Dies ist eine Platzhalter-Seite für das Dashboard. Hier werden später wichtige Kennzahlen und Übersichten angezeigt.
        </p>
      </div>
    </div>
  );
}
