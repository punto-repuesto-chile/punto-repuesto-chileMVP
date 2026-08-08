import React from "react"

import ReactDOM from "react-dom/client"

import { BrowserRouter, Route, Routes } from "react-router-dom"

import App from "./App"

import ProtectedRoute from "./components/auth/ProtectedRoute"

import { AuthProvider } from "./context/AuthContext"

import EditListingPage from "./pages/EditListingPage"

import LoginPage from "./pages/LoginPage"

import ListingDetailPage from "./pages/ListingDetailPage"

import MyListingsPage from "./pages/MyListingsPage"

import PublishProductPage from "./pages/PublishProductPage"

import RegisterPage from "./pages/RegisterPage"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/publicacion/:id" element={<ListingDetailPage />} />
          <Route
            path="/publicacion/:id/editar"
            element={
              <ProtectedRoute>
                <EditListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publicar"
            element={
              <ProtectedRoute>
                <PublishProductPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-publicaciones"
            element={
              <ProtectedRoute>
                <MyListingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
