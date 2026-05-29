import { Link } from "react-router-dom";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";

export default function AccessDenied() {
  return (
    <>
      <PageHeader title="Access Denied" description="This feature is not available in your current plan." />
      <Alert type="info">Contact your administrator to upgrade the plan or enable this feature.</Alert>
      <div className="mt-4">
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </>
  );
}
