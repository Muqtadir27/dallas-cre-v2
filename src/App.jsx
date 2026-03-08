import { useState } from 'react';
import { useProperties } from './hooks/useProperties';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import PredictorPanel from './components/PredictorPanel';
import TopBar from './components/TopBar';
import PropertyDrawer from './components/PropertyDrawer';
import styles from './App.module.css';

export default function App() {
  const [filters, setFilters] = useState({});
  const [activeView, setActiveView] = useState('map'); // map | analytics | predictor
  const [mapMode, setMapMode] = useState('markers'); // markers | heatmap | clusters
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data, loading, error } = useProperties(filters);

  return (
    <div className={styles.app}>
      <TopBar
        activeView={activeView}
        setActiveView={setActiveView}
        stats={data?.stats}
        loading={loading}
      />
      <div className={styles.body}>
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          filters={filters}
          setFilters={setFilters}
          stats={data?.stats}
          neighborhoods={data?.neighborhoods}
          loading={loading}
        />
        <main className={styles.main}>
          {activeView === 'map' && (
            <MapView
              properties={data?.properties || []}
              loading={loading}
              mapMode={mapMode}
              setMapMode={setMapMode}
              onSelectProperty={setSelectedProperty}
              selectedProperty={selectedProperty}
            />
          )}
          {activeView === 'analytics' && (
            <AnalyticsPanel
              stats={data?.stats}
              properties={data?.properties || []}
              loading={loading}
            />
          )}
          {activeView === 'predictor' && (
            <PredictorPanel neighborhoods={data?.neighborhoods || []} />
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
