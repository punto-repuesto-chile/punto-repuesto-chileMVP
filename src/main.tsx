import React from "react"

import ReactDOM from "react-dom/client"

import { BrowserRouter, Route, Routes } from "react-router-dom"

import App from "./App"

import ProtectedRoute from "./components/auth/ProtectedRoute"

import { AuthProvider } from "./context/AuthContext"

import { FavoritesProvider } from "./context/FavoritesContext"

import EditListingPage from "./pages/EditListingPage"

import LoginPage from "./pages/LoginPage"

import ListingDetailPage from "./pages/ListingDetailPage"

import MyListingsPage from "./pages/MyListingsPage"

import PublishProductPage from "./pages/PublishProductPage"

import RegisterPage from "./pages/RegisterPage"

import SearchListingsPage from "./pages/SearchListingsPage"

import FavoritesPage from "./pages/FavoritesPage"

import SellerProfilePage from "./pages/SellerProfilePage"

import MyProfilePage from "./pages/MyProfilePage"

import RecoverPasswordPage from "./pages/RecoverPasswordPage"

import UpdatePasswordPage from "./pages/UpdatePasswordPage"

import MySalvageYardPage from "./pages/MySalvageYardPage"

import MyReviewInteractionsPage from "./pages/MyReviewInteractionsPage"

import RegisterSalvageYardPage from "./pages/RegisterSalvageYardPage"
import SalvageYardsPage from "./pages/SalvageYardsPage"
import SalvageYardProfilePage from "./pages/SalvageYardProfilePage"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route
              path="/recuperar-password"
              element={<RecoverPasswordPage />}
            />
            <Route
              path="/actualizar-password"
              element={<UpdatePasswordPage />}
            />
            <Route
              path="/registrar-desarmaduria"
              element={
                <ProtectedRoute>
                  <RegisterSalvageYardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-desarmaduria"
              element={
                <ProtectedRoute>
                  <MySalvageYardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/publicacion/:id" element={<ListingDetailPage />} />
            <Route path="/vendedor/:sellerId" element={<SellerProfilePage />} />
            <Route path="/buscar" element={<SearchListingsPage />} />
            <Route path="/desarmadurias" element={<SalvageYardsPage />} />
            <Route
              path="/desarmaduria/:id"
              element={<SalvageYardProfilePage />}
            />
            <Route
              path="/mi-perfil"
              element={
                <ProtectedRoute>
                  <MyProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favoritos"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/mis-tratos"
              element={
                <ProtectedRoute>
                  <MyReviewInteractionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<App />} />
          </Routes>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
