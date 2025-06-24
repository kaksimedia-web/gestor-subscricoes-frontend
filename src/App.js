import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Bell, AlertTriangle, DollarSign, Clock, Loader2 } from 'lucide-react';

const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // URL da API online
  const API_BASE = 'https://gestor-subscricoes-production.up.railway.app/api';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    renewalType: 'mensal',
    startDate: '',
    description: '',
    category: ''
  });

  const [filter, setFilter] = useState('todas');

  // Carregar subscrições da API
  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/subscriptions`);
      if (!response.ok) {
        throw new Error('Erro ao carregar subscrições');
      }
      const data = await response.json();
      setSubscriptions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar subscrições:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadSubscriptions();
  }, []);

  // Calcular próxima renovação
  const getNextRenewal = (startDate, renewalType) => {
    if (!startDate) return new Date();
    
    const start = new Date(startDate);
    const today = new Date();
    
    if (renewalType === 'mensal') {
      const nextRenewal = new Date(start);
      while (nextRenewal <= today) {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      }
      return nextRenewal;
    } else {
      const nextRenewal = new Date(start);
      while (nextRenewal <= today) {
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      }
      return nextRenewal;
    }
  };

  // Verificar se precisa de notificação
  const needsNotification = (subscription) => {
    if (subscription.notification) {
      return subscription.notification;
    }
    
    const nextRenewal = getNextRenewal(subscription.startDate, subscription.renewalType);
    const today = new Date();
    const daysDiff = Math.ceil((nextRenewal - today) / (1000 * 60 * 60 * 24));
    
    if (subscription.renewalType === 'mensal' && daysDiff <= 7) {
      return { urgent: daysDiff <= 3, days: daysDiff };
    }
    if (subscription.renewalType === 'anual' && daysDiff <= 30) {
      return { urgent: daysDiff <= 7, days: daysDiff };
    }
    return null;
  };

  // Obter subscrições com notificações
  const getSubscriptionsWithNotifications = () => {
    return subscriptions.filter(sub => needsNotification(sub));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      renewalType: 'mensal',
      startDate: '',
      description: '',
      category: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.startDate || !formData.category) {
      alert('Por favor, preenche todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      
      const submissionData = {
        name: formData.name,
        price: parseFloat(formData.price),
        renewalType: formData.renewalType,
        startDate: formData.startDate,
        description: formData.description || '',
        category: formData.category
      };

      let response;
      if (editingId) {
        // Actualizar subscrição existente
        response = await fetch(`${API_BASE}/subscriptions/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        });
      } else {
        // Criar nova subscrição
        response = await fetch(`${API_BASE}/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        });
      }

      if (!response.ok) {
        throw new Error('Erro ao guardar subscrição');
      }

      // Recarregar a lista
      await loadSubscriptions();
      resetForm();
      
    } catch (err) {
      setError(err.message);
      console.error('Erro ao guardar:', err);
      alert('Erro ao guardar subscrição: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subscription) => {
    setFormData({
      name: subscription.name,
      price: subscription.price.toString(),
      renewalType: subscription.renewalType,
      startDate: subscription.startDate,
      description: subscription.description,
      category: subscription.category
    });
    setEditingId(subscription.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem a certeza que pretende eliminar esta subscrição?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao eliminar subscrição');
      }

      // Recarregar a lista
      await loadSubscriptions();
      
    } catch (err) {
      setError(err.message);
      console.error('Erro ao eliminar:', err);
      alert('Erro ao eliminar subscrição: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'todas') return true;
    if (filter === 'notificacoes') return needsNotification(sub);
    return sub.renewalType === filter;
  });

  const totalMensal = subscriptions
    .filter(sub => sub.renewalType === 'mensal')
    .reduce((sum, sub) => sum + (sub.price || 0), 0);

  const totalAnual = subscriptions
    .filter(sub => sub.renewalType === 'anual')
    .reduce((sum, sub) => sum + (sub.price || 0), 0);

  // Loading state
  if (loading && subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">A carregar subscrições...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestor de subscrições</h1>
              {error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Nova subscrição
            </button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <DollarSign size={16} />
                <span className="font-medium">Total mensal</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatPrice(totalMensal)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Calendar size={16} />
                <span className="font-medium">Total anual</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatPrice(totalAnual)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <Bell size={16} />
                <span className="font-medium">Notificações</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{getSubscriptionsWithNotifications().length}</p>
            </div>
          </div>
        </div>

        {/* Notificações */}
        {getSubscriptionsWithNotifications().length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-orange-600" size={20} />
              <h2 className="font-semibold text-orange-800">Renovações próximas</h2>
            </div>
            <div className="space-y-2">
              {getSubscriptionsWithNotifications().map(sub => {
                const notification = needsNotification(sub);
                return (
                  <div key={sub.id} className={`flex justify-between items-center p-3 rounded ${
                    notification.urgent ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-sm">
                      Renova em {notification.days} dia{notification.days !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'mensal', label: 'Mensais' },
              { key: 'anual', label: 'Anuais' },
              { key: 'notificacoes', label: 'Com notificações' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === option.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de subscrições */}
        {subscriptions.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma subscrição encontrada</h3>
            <p className="text-gray-500 mb-4">Comece por adicionar a primeira subscrição da sua empresa.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Adicionar primeira subscrição
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredSubscriptions.map(subscription => {
              const nextRenewal = subscription.nextRenewal ? new Date(subscription.nextRenewal) : getNextRenewal(subscription.startDate, subscription.renewalType);
              const notification = needsNotification(subscription);
              
              return (
                <div key={subscription.id} className={`bg-white rounded-lg shadow-sm border p-4 ${
                  notification ? (notification.urgent ? 'border-red-300' : 'border-orange-300') : ''
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{subscription.name}</h3>
                      <span className="text-sm text-gray-500">{subscription.category}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(subscription)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(subscription.id)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{subscription.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Preço:</span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(subscription.price)}/{subscription.renewalType === 'mensal' ? 'mês' : 'ano'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Próxima renovação:</span>
                      <span className="text-sm text-gray-900">{formatDate(nextRenewal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Tipo:</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        subscription.renewalType === 'mensal' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {subscription.renewalType}
                      </span>
                    </div>
                  </div>
                  
                  {notification && (
                    <div className={`mt-3 p-2 rounded text-xs text-center ${
                      notification.urgent
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      <Clock size={12} className="inline mr-1" />
                      Renova em {notification.days} dia{notification.days !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Formulário modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {editingId ? 'Editar subscrição' : 'Nova subscrição'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da subscrição
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ex: Software, Design, Infraestrutura"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preço (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de renovação
                      </label>
                      <select
                        value={formData.renewalType}
                        onChange={(e) => setFormData({...formData, renewalType: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de início
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      editingId ? 'Guardar' : 'Criar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;
