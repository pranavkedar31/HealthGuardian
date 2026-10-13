import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Stat from "../components/Stat";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [mlModels, setMlModels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [stats, usersResponse, doctorsResponse, mlResponse] =
        await Promise.allSettled([
          apiClient.get("/admin/statistics"),
          apiClient.get("/admin/users"),
          apiClient.get("/admin/doctors"),
          apiClient.get("/ai/ml-models"),
        ]);

      if (stats.status === "fulfilled") setStatistics(stats.value.data);
      if (usersResponse.status === "fulfilled") setUsers(usersResponse.value.data || []);
      if (doctorsResponse.status === "fulfilled") setDoctors(doctorsResponse.value.data || []);
      if (mlResponse.status === "fulfilled") setMlModels(mlResponse.value.data || null);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const changeStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      setError("You cannot deactivate your own admin account.");
      return;
    }

    try {
      setError("");

      if (targetUser.is_active) {
        await apiClient.put(
          `/admin/users/${targetUser.id}/deactivate`
        );
      } else {
        await apiClient.put(
          `/admin/users/${targetUser.id}/activate`
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update user status."
      );
    }
  };

  return (
    <>
      <Navbar />

      <Page
        title="Admin Dashboard"
        subtitle="Manage HealthGuardian users, doctors and platform activity."
        action={
          <div className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            <Icon name="shield" size={14} />
            Administrator
          </div>
        }
      >
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Loading admin dashboard...
            </p>
          </div>
        ) : (
          <>
            {/* Platform statistics */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Total Users"
                value={statistics?.total_users ?? 0}
                note="Registered accounts"
                icon={<Icon name="user" size={18} />}
              />

              <Stat
                label="Doctors"
                value={statistics?.total_doctors ?? 0}
                note="Registered doctors"
                icon={<Icon name="shield" size={18} />}
              />

              <Stat
                label="Active Users"
                value={statistics?.active_users ?? 0}
                note="Currently active"
                icon={<Icon name="check" size={18} />}
              />

              <Stat
                label="Inactive Users"
                value={statistics?.inactive_users ?? 0}
                note="Deactivated accounts"
                icon={<Icon name="alert" size={18} />}
              />
            </div>

            {/* Machine Learning Validation & Comparison */}
            {mlModels && (
              <div className="mt-5">
                <Card
                  title="Machine Learning Model Comparison & Selection"
                  subtitle="Validated performance metrics (Logistic Regression vs Random Forest) for clinical risk tasks."
                >
                  <div className="space-y-6">
                    {Object.entries(mlModels).map(([task, candidates]) => (
                      <div key={task} className="border-b border-slate-100 pb-4 last:border-none dark:border-slate-800">
                        <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                          Task: {task.replace("_", " ")}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                                <th className="py-2">Algorithm</th>
                                <th className="py-2">Accuracy</th>
                                <th className="py-2">Precision</th>
                                <th className="py-2">Recall (Sensitivity)</th>
                                <th className="py-2">F1-Score</th>
                                <th className="py-2">ROC-AUC</th>
                                <th className="py-2">Selected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidates.map((m) => (
                                <tr key={m.model_name} className="border-b border-slate-50 dark:border-slate-800/50">
                                  <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">{m.model_name}</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{(m.accuracy * 100).toFixed(1)}%</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{(m.precision * 100).toFixed(1)}%</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{(m.recall * 100).toFixed(1)}%</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{(m.f1_score * 100).toFixed(1)}%</td>
                                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{(m.roc_auc * 100).toFixed(1)}%</td>
                                  <td className="py-2.5">
                                    {m.selected ? (
                                      <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">Active Selected</span>
                                    ) : (
                                      <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800">Evaluated</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Users */}

            <div className="mt-5">
              <Card
                title="Registered Users"
                subtitle="View and manage HealthGuardian accounts."
              >
                {users.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No users found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-3 py-3 text-xs font-black uppercase text-slate-400">
                            User
                          </th>

                          <th className="px-3 py-3 text-xs font-black uppercase text-slate-400">
                            Role
                          </th>

                          <th className="px-3 py-3 text-xs font-black uppercase text-slate-400">
                            Status
                          </th>

                          <th className="px-3 py-3 text-right text-xs font-black uppercase text-slate-400">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-50 dark:border-slate-800/60"
                          >
                            <td className="px-3 py-4">
                              <div className="font-extrabold text-slate-800 dark:text-white">
                                {item.full_name}
                              </div>

                              <div className="text-xs text-slate-400">
                                {item.email}
                              </div>
                            </td>

                            <td className="px-3 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {item.role}
                              </span>
                            </td>

                            <td className="px-3 py-4">
                              {item.is_active ? (
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                                  Active
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {item.id === user?.id ? (
                                <span className="text-xs font-bold text-slate-400">
                                  Current account
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeStatus(item)
                                  }
                                  className={
                                    item.is_active
                                      ? "rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/60"
                                      : "rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900/60"
                                  }
                                >
                                  {item.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Doctors */}

            <div className="mt-5">
              <Card
                title="Registered Doctors"
                subtitle="Doctors registered on the HealthGuardian platform."
              >
                {doctors.length === 0 ? (
                  <div className="py-8 text-center">
                    <Icon name="user" size={28} />

                    <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                      No doctors registered yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                            <Icon name="user" size={18} />
                          </div>

                          <div>
                            <div className="font-extrabold text-slate-800 dark:text-white">
                              {doctor.full_name}
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {doctor.email}
                            </div>

                            <div className="mt-2">
                              {doctor.is_active ? (
                                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                                  Active
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </Page>
    </>
  );
}