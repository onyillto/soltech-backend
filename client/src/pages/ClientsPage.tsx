import { useState } from "react";
import type { FormEvent } from "react";
import { useResource } from "../lib/useResource";
import { useToast } from "../state/ToastContext";
import { ClientsApi } from "../api/resources";
import { DataTable } from "../components/DataTable";
import { Field, PageHeader, Panel, Spinner } from "../components/ui";
import { ApiError } from "../api/client";
import { formatDate } from "../lib/format";

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ClientsApi.create({ name, phone, email: email || undefined });
      notify(`${name} registered`, "success");
      setName("");
      setPhone("");
      setEmail("");
      onCreated();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to register client", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Farida Farmer" required />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" required />
        </Field>
        <Field label="Email (optional)">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="farida@example.com" />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={submitting || !name || !phone}>
          {submitting ? "Registering…" : "Register client"}
        </button>
      </div>
    </form>
  );
}

export function ClientsPage() {
  const clientsRes = useResource(() => ClientsApi.list(), []);

  return (
    <>
      <PageHeader
        title="Clients"
        lede="Farmers, market women, and traders who place produce into cold storage. They don't log in — register and manage them here on their behalf."
      />

      <div className="section">
        <Panel title="Register a client">
          <NewClientForm onCreated={clientsRes.reload} />
        </Panel>
      </div>

      <div className="section">
        <Panel title="All clients">
          {clientsRes.loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={clientsRes.data?.data ?? []}
              rowKey={(c) => c._id}
              emptyText="No clients registered yet."
              columns={[
                { header: "Name", render: (c) => c.name },
                { header: "Phone", render: (c) => c.phone },
                { header: "Email", render: (c) => c.email ?? "—" },
                { header: "Registered", render: (c) => formatDate(c.createdAt) },
              ]}
            />
          )}
        </Panel>
      </div>
    </>
  );
}
