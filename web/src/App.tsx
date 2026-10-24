import { Layout } from './components/Layout'
import { useRoute } from './lib/route'
import { MissionPlansView } from './views/MissionPlansView'
import { PlannerView } from './views/PlannerView'

export default function App() {
  const route = useRoute()

  return (
    <Layout route={route}>
      {route.view === 'plans' ? <MissionPlansView /> : <PlannerView key={route.planId ?? 'new'} planId={route.planId} />}
    </Layout>
  )
}
