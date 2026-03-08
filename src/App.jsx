import { useState, useMemo } from 'react';
import { useProperties } from './hooks/useProperties';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import PredictorPanel from './components/PredictorPanel';
import TopBar from './components/TopBar';
import PropertyDrawer from './components/PropertyDrawer';
import styles from './App.module.css';

function computeStats(properties) {
  if (!properties || properties.length === 0) return null;
  const total = properties.length;
  const avgValue = Math.round(properties.reduce((s, p) => s + (p.list_price || 0), 0) / total);
  const avgRent = Math.round(properties.reduce((s, p) => s + (p.monthly_rent || 0), 0) / total);
  const avgCapRate = (properties.reduce((s, p) => s + (p.cap_rate || 0), 0) / total).toFixed(2);
  const vacantCount = properties.filter(p => p.occupancy_status === 'Vacant').length;
  const occupiedCount = properties.filter(p => p.occupancy_status === 'Occupied').length;
  const totalValue = properties.reduce((s, p) => s + (p.list_price || 0), 0);

  // Neighborhood breakdown
  const nbrMap = {};
  properties.forEach(p => {
    if (!nbrMap[p.neighborhood]) nbrMap[p.neighborhood] = { name: p.neighborhood, tier: p.tier, count: 0, totalValue: 0, totalCap: 0 };
    nbrMap[p.neighborhood].count++;
    nbrMap[p.neighborhood].totalValue += p.list_price || 0;
    nbrMap[p.neighborhood].totalCap += p.cap_rate || 0;
  });
  const neighborhoodBreakdown = Object.values(nbrMap).map(n => ({
    name: n.name, tier: n.tier, count: n.count,
    avgValue: Math.round(n.totalValue / n.count),
    avgCapRate: parseFloat((n.totalCap / n.count).toFixed(2)),
  }));

  // Type breakdown
  const typeMap = {};
  properties.forEach(p => {
    if (!typeMap[p.property_type]) typeMap[p.property_type] = { type: p.property_type, count: 0, totalValue: 0 };
    typeMap[p.property_type].count++;
    typeMap[p.property_type].totalValue += p.list_price || 0;
  });
  const typeBreakdown = Object.values(typeMap).map(t => ({
    type: t.type, count: t.count, avgValue: Math.round(t.totalValue / t.count),
  }));

  return { total, avgValue, avgRent, avgCapRate, vacantCount, occupiedCount, totalValue, neighborhoodBreakdown, typeBreakdown };
}

export default function App() {
  const [filters, setFilters] = useState({});
  const [activeView, setActiveView] = useState('map');
  const [mapMode, setMapMode] = useState('markers');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { properties: allProperties, loading, source } = useProperties();

  // Apply filters
  const properties = useMemo(() => {
    if (!allProperties) return [];
    return allProperties.filter(p => {
      if (filters.tier && filters.tier !== 'all' && p.tier !== filters.tier) return false;
      if (filters.type && filters.type !== 'all' && p.property_type !== filters.type) return false;
      if (filters.occupancy && filters.occupancy !== 'all' && p.occupancy_status !== filters.occupancy) return false;
      if (filters.minValue && p.list_price < Number(filters.minValue)) return false;
      if (filters.maxValue && p.list_price > Number(filters.maxValue)) return false;
      return true;
    });
  }, [allProperties, filters]);

  const stats = useMemo(() => computeStats(properties), [properties]);
  const neighborhoods = useMemo(() => [...new Set((allProperties || []).map(p => p.neighborhood))].sort(), [allProperties]);

  return (
    <div className={styles.app}>
      <TopBar
        activeView={activeView}
        setActiveView={setActiveView}
        stats={stats}
        loading={loading}
      />
      <div className={styles.body}>
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          filters={filters}
          setFilters={setFilters}
          stats={stats}
          neighborhoods={neighborhoods}
          loading={loading}
        />
        <main className={styles.main}>
          {activeView === 'map' && (
            <MapView
              properties={properties}
              loading={loading}
              mapMode={mapMode}
              setMapMode={setMapMode}
              onSelectProperty={setSelectedProperty}
              selectedProperty={selectedProperty}
              source={source}
              total={allProperties?.length || 0}
            />
          )}
          {activeView === 'analytics' && (
            <AnalyticsPanel
              stats={stats}
              properties={properties}
              loading={loading}
            />
          )}
          {activeView === 'predictor' && (
            <PredictorPanel neighborhoods={neighborhoods} />
          )}
        </main>
      </div>
      {selectedProperty && (
        <PropertyDrawer
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
