import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";

export default function PlansPlaceholder() {
  return (
    <>
      <PageHeader title="Plans" description="Subscription plan configuration will be added in the next SaaS phase." />
      <Alert type="info">
        Plans are stored on organizations today. Feature permissions and subscription limits are intentionally not implemented yet.
      </Alert>
    </>
  );
}
