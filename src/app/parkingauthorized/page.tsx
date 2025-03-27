"use client";
import PaymentApproval from '@/app/parkingauthorized/Parkingapprovals';
import PrivateRoute from '@/app/protectedRoute'

export default function App() {
  return (
    <main>
      <section>
        <PrivateRoute>
        <PaymentApproval />
        </PrivateRoute>
      </section>
    </main>
  );
}
