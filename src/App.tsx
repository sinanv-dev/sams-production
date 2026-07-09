import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ToastContainer } from './components/common/Toast';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { OwnerLayout } from './layouts/OwnerLayout';
import { CustomerLayout } from './layouts/CustomerLayout';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';
import { AdminLogin } from './pages/public/AdminLogin';
import { AboutUs } from './pages/public/AboutUs';
import { ContactUs } from './pages/public/ContactUs';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsConditions } from './pages/public/TermsConditions';
import { FAQ } from './pages/public/FAQ';
import { OurMission } from './pages/public/OurMission';
import { FindApartments } from './pages/public/FindApartments';
import { Features } from './pages/public/Features';
import { HelpCenter } from './pages/public/HelpCenter';
import { ReportIssue } from './pages/public/ReportIssue';
import { RefundPolicy } from './pages/public/RefundPolicy';
import { CookiePolicy } from './pages/public/CookiePolicy';

// Admin Portal Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminBilling } from './pages/admin/Billing';
import { AdminElectricity } from './pages/admin/Electricity';
import { AdminComplaints } from './pages/admin/Complaints';
import { AdminSettings } from './pages/admin/Settings';

// Admin Expanded CRUD Page Views
import { OwnerList } from './pages/admin/owners/OwnerList';
import { OwnerCreate } from './pages/admin/owners/OwnerCreate';
import { OwnerDetails } from './pages/admin/owners/OwnerDetails';
import { OwnerEdit } from './pages/admin/owners/OwnerEdit';

import { ApartmentList } from './pages/admin/apartments/ApartmentList';
import { ApartmentCreate } from './pages/admin/apartments/ApartmentCreate';
import { ApartmentDetails } from './pages/admin/apartments/ApartmentDetails';
import { ApartmentEdit } from './pages/admin/apartments/ApartmentEdit';

import { CustomerList } from './pages/admin/customers/CustomerList';
import { CustomerDetails } from './pages/admin/customers/CustomerDetails';
import { CustomerEdit } from './pages/admin/customers/CustomerEdit';

import { RequestList } from './pages/admin/requests/RequestList';
import { RequestDetails } from './pages/admin/requests/RequestDetails';

import { RoomList } from './pages/admin/rooms/RoomList';
import { RoomCreate } from './pages/admin/rooms/RoomCreate';
import { RoomEdit } from './pages/admin/rooms/RoomEdit';
import { RoomDetails } from './pages/admin/rooms/RoomDetails';

import { AdminNotifications } from './pages/admin/notifications/AdminNotifications';
import { AdminReports } from './pages/admin/reports/AdminReports';
import { AuditLogs } from './pages/admin/audit/AuditLogs';
import { DocumentCenter } from './pages/admin/DocumentCenter';
import { AdminList } from './pages/admin/admins/AdminList';
import { AdminCreate } from './pages/admin/admins/AdminCreate';
import { AdminDetails } from './pages/admin/admins/AdminDetails';

// Owner Portal Pages
import { OwnerDashboard } from './pages/owner/Dashboard';
import { OwnerApartments } from './pages/owner/Apartments';
import { OwnerCustomers } from './pages/owner/Customers';
import { OwnerComplaints } from './pages/owner/Complaints';
import { OwnerRent } from './pages/owner/Rent';
import { OwnerElectricity } from './pages/owner/Electricity';
import { RoomDetails as OwnerRoomDetails } from './pages/owner/RoomDetails';
import { OwnerReports } from './pages/owner/Reports';
import { OwnerNotifications } from './pages/owner/Notifications';
import { OwnerSettings } from './pages/owner/Settings';
import { OwnerHelp } from './pages/owner/Help';
import { OccupancyDetails } from './pages/owner/OccupancyDetails';
import { RevenueAnalytics } from './pages/owner/RevenueAnalytics';
import { OwnerApartmentDetails } from './pages/owner/ApartmentDetails';
import { CustomerProfile } from './pages/owner/CustomerProfile';
import { ComplaintDetails } from './pages/owner/ComplaintDetails';
import { BillDetails } from './pages/owner/BillDetails';
import { OwnerRooms } from './pages/owner/Rooms';

// Customer Portal Pages
import { CustomerDashboard } from './pages/customer/Dashboard';
import { CustomerBrowse } from './pages/customer/Browse';
import { CustomerRequests } from './pages/customer/Requests';
import { CustomerRent } from './pages/customer/Rent';
import { CustomerElectricity } from './pages/customer/Electricity';
import { CustomerComplaints } from './pages/customer/Complaints';
import { CustomerSettings } from './pages/customer/Settings';
import { CustomerApartment } from './pages/customer/Apartment';
import { CustomerDocuments } from './pages/customer/Documents';
import { CustomerNotifications } from './pages/customer/Notifications';

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/mission" element={<OurMission />} />
          <Route path="/apartments" element={<FindApartments />} />
          <Route path="/features" element={<Features />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />

          {/* Admin Protected Portal Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    
                    {/* Owner CRUD Sub-routes */}
                    <Route path="owners" element={<OwnerList />} />
                    <Route path="owners/new" element={<OwnerCreate />} />
                    <Route path="owners/:id" element={<OwnerDetails />} />
                    <Route path="owners/:id/edit" element={<OwnerEdit />} />

                    {/* Apartment CRUD Sub-routes */}
                    <Route path="apartments" element={<ApartmentList />} />
                    <Route path="apartments/new" element={<ApartmentCreate />} />
                    <Route path="apartments/:id" element={<ApartmentDetails />} />
                    <Route path="apartments/:id/edit" element={<ApartmentEdit />} />

                    {/* Customer CRUD Sub-routes */}
                    <Route path="customers" element={<CustomerList />} />
                    <Route path="customers/:id" element={<CustomerDetails />} />
                    <Route path="customers/:id/edit" element={<CustomerEdit />} />

                    {/* Requests CRUD Sub-routes */}
                    <Route path="requests" element={<RequestList />} />
                    <Route path="requests/:id" element={<RequestDetails />} />

                    {/* Room Management */}
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="rooms/new" element={<RoomCreate />} />
                    <Route path="rooms/:id" element={<RoomDetails />} />
                    <Route path="rooms/:id/edit" element={<RoomEdit />} />
                    <Route path="rooms/:id/assign" element={<RoomDetails />} />

                    {/* Admin Management */}
                    <Route path="admins" element={<AdminList />} />
                    <Route path="admins/new" element={<AdminCreate />} />
                    <Route path="admins/:id" element={<AdminDetails />} />

                    {/* New Admin Modules */}
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="audit" element={<AuditLogs />} />
                    <Route path="documents" element={<DocumentCenter />} />

                    <Route path="rent" element={<AdminBilling />} />
                    <Route path="electricity" element={<AdminElectricity />} />
                    <Route path="complaints" element={<AdminComplaints />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Owner Protected Portal Routes */}
          <Route
            path="/owner/*"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerLayout>
                  <Routes>
                    <Route path="dashboard" element={<OwnerDashboard/>}/>
                    <Route path="apartments" element={<OwnerApartments/>}/>
                    <Route path="apartments/occupancy" element={<OccupancyDetails/>}/>
                    <Route path="apartments/:id" element={<OwnerApartmentDetails/>}/>
                    <Route path="rooms" element={<OwnerRooms/>}/>
                    <Route path="customers" element={<OwnerCustomers/>}/>
                    <Route path="customers/:id" element={<CustomerProfile/>}/>
                    <Route path="complaints" element={<OwnerComplaints/>}/>
                    <Route path="complaints/:id" element={<ComplaintDetails/>}/>
                    <Route path="rent" element={<OwnerRent/>}/>
                    <Route path="electricity" element={<OwnerElectricity/>}/>
                    <Route path="electricity/:id" element={<BillDetails/>}/>
                    <Route path="documents" element={<OwnerCustomers/>}/>
                    <Route path="rooms/:id" element={<OwnerRoomDetails/>}/>
                    <Route path="reports" element={<OwnerReports/>}/>
                    <Route path="reports/revenue" element={<RevenueAnalytics/>}/>
                    <Route path="notifications" element={<OwnerNotifications/>}/>
                    <Route path="settings" element={<OwnerSettings/>}/>
                    <Route path="help" element={<OwnerHelp/>}/>
                    <Route path="*" element={<Navigate to="dashboard" replace/>}/>
                  </Routes>
                </OwnerLayout>
              </ProtectedRoute>
            }
          />

          {/* Customer Protected Portal Routes */}
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout>
                  <Routes>
                    <Route path="dashboard" element={<CustomerDashboard />} />
                    <Route path="browse" element={<CustomerBrowse />} />
                    <Route path="requests" element={<CustomerRequests />} />
                    <Route path="rent" element={<CustomerRent />} />
                    <Route path="electricity" element={<CustomerElectricity />} />
                    <Route path="complaints" element={<CustomerComplaints />} />
                    <Route path="settings" element={<CustomerSettings />} />
                    <Route path="apartment" element={<CustomerApartment />} />
                    <Route path="documents" element={<CustomerDocuments />} />
                    <Route path="notifications" element={<CustomerNotifications />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
    <ToastContainer />
    </ToastProvider>
  );
}
