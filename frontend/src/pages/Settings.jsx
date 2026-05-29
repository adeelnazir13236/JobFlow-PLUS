import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Configure defaults for the JobFlow workspace." />
      <form className="interactive-card max-w-2xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Input label="Company Name" defaultValue="JobFlow" />
        <Input label="Default Follow-up Days" type="number" defaultValue="15" />
        <Input label="API URL" defaultValue={import.meta.env.VITE_API_URL || "http://localhost:5000/api"} />
        <div className="flex justify-end">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </>
  );
}
