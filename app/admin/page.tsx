'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ResultItem = {
  option: string;
  total: string;
};

type Stats = {
  totalStudents: number;
  totalVotes: number;
  participation: number;
};

type ElectionStatus = {
  id: number;
  isOpen: boolean;
  openedAt: string | null;
  closedAt: string | null;
};

type MeResponse = {
  id: number;
  username: string;
  role: string;
};

type Student = {
  id: number;
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

type StudentFormState = {
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

const emptyStudentForm: StudentFormState = {
  dni: '',
  fullName: '',
  course: '',
  enabled: true,
};

export default function AdminPage() {
  const API = 'http://localhost:3000';

  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [me, setMe] = useState<MeResponse | null>(null);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    'open' | 'close' | 'reset' | null
  >(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [hasSearchedStudents, setHasSearchedStudents] = useState(false);
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(emptyStudentForm);
  const [studentFormLoading, setStudentFormLoading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const authHeaders = (jwt: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  });

  const loadElectionData = async () => {
    setLoading(true);
    setError('');

    try {
      const [resultsRes, statsRes, electionRes] = await Promise.all([
        fetch(`${API}/votes/results`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API}/votes/stats`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API}/election`, { cache: 'no-store' }),
      ]);

      if (!resultsRes.ok || !statsRes.ok || !electionRes.ok) {
        throw new Error('No se pudieron obtener los datos de la elección');
      }

      const resultsData: ResultItem[] = await resultsRes.json();
      const statsData: Stats = await statsRes.json();
      const electionData: ElectionStatus = await electionRes.json();

      setResults(resultsData);
      setStats(statsData);
      setElection(electionData);
      setLastUpdate(new Date().toLocaleString('es-AR'));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (
    jwt: string,
    search: string,
    keepError = false,
  ): Promise<void> => {
    const term = search.trim();

    if (!term) {
      setStudents([]);
      setHasSearchedStudents(false);
      if (!keepError) {
        setStudentsError('');
      }
      return;
    }

    setStudentsLoading(true);
    setHasSearchedStudents(true);

    if (!keepError) {
      setStudentsError('');
    }

    try {
      const query = `?search=${encodeURIComponent(term)}`;

      const res = await fetch(`${API}/students${query}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudieron cargar los alumnos');
      }

      setStudents(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al cargar los alumnos');
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadInitialAdminData = async (jwt: string) => {
    await Promise.all([
      (async () => {
        setLoading(true);
        setError('');

        try {
          const [resultsRes, statsRes, electionRes] = await Promise.all([
            fetch(`${API}/votes/results`, {
              cache: 'no-store',
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            }),
            fetch(`${API}/votes/stats`, {
              cache: 'no-store',
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            }),
            fetch(`${API}/election`, { cache: 'no-store' }),
          ]);

          if (!resultsRes.ok || !statsRes.ok || !electionRes.ok) {
            throw new Error('No se pudieron obtener los datos de la elección');
          }

          const resultsData: ResultItem[] = await resultsRes.json();
          const statsData: Stats = await statsRes.json();
          const electionData: ElectionStatus = await electionRes.json();

          setResults(resultsData);
          setStats(statsData);
          setElection(electionData);
          setLastUpdate(new Date().toLocaleString('es-AR'));
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Ocurrió un error al cargar los datos');
          }
        } finally {
          setLoading(false);
        }
      })(),
    ]);

    setStudents([]);
    setHasSearchedStudents(false);
    setStudentsError('');
  };

  const validateStoredToken = async (storedToken: string) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Sesión inválida');
      }

      const data: MeResponse = await res.json();

      if (data.role !== 'ADMIN') {
        throw new Error('Acceso solo para administrador');
      }

      setToken(storedToken);
      setMe(data);
      setIsAuthenticated(true);
      await loadInitialAdminData(storedToken);
    } catch {
      localStorage.removeItem('admin_token');
      setToken('');
      setMe(null);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');

    if (!storedToken) {
      setAuthLoading(false);
      return;
    }

    validateStoredToken(storedToken);
  }, []);

  const normalizedResults = useMemo(() => {
    const list10 = results.find((r) => r.option === 'Lista 10');
    const list15 = results.find((r) => r.option === 'Lista 15');

    return [
      { option: 'Lista 10', total: Number(list10?.total ?? 0) },
      { option: 'Lista 15', total: Number(list15?.total ?? 0) },
    ];
  }, [results]);

  const winnerText = useMemo(() => {
    const [a, b] = normalizedResults;

    if (a.total === 0 && b.total === 0) {
      return 'Sin votos registrados';
    }

    if (a.total === b.total) {
      return 'Empate';
    }

    return a.total > b.total ? 'Lista 10' : 'Lista 15';
  }, [normalizedResults]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo iniciar sesión');
      }

      localStorage.setItem('admin_token', data.access_token);
      setToken(data.access_token);
      setMe(data.user);
      setIsAuthenticated(true);
      await loadInitialAdminData(data.access_token);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError('Error al iniciar sesión');
      }
    } finally {
      setLoginLoading(false);
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setMe(null);
    setIsAuthenticated(false);
    setResults([]);
    setStats(null);
    setElection(null);
    setStudents([]);
    setStudentSearch('');
    setHasSearchedStudents(false);
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setError('');
    setStudentsError('');
    setLastUpdate('');
  };

  const handleOpenVoting = async () => {
    const confirmed = window.confirm('¿Desea abrir la votación?');
    if (!confirmed) return;

    setActionLoading('open');
    setError('');

    try {
      const res = await fetch(`${API}/election/open`, {
        method: 'POST',
        headers: authHeaders(token),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo abrir la votación');
      }

      await loadElectionData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al abrir la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseVoting = async () => {
    const confirmed = window.confirm(
      '¿Desea cerrar la votación? Luego no se podrán registrar nuevos votos.',
    );
    if (!confirmed) return;

    setActionLoading('close');
    setError('');

    try {
      const res = await fetch(`${API}/election/close`, {
        method: 'POST',
        headers: authHeaders(token),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo cerrar la votación');
      }

      await loadElectionData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al cerrar la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetVoting = async () => {
    const confirmed = window.confirm(
      '¿Desea reiniciar la votación? Esta acción eliminará todos los votos registrados y volverá a abrir la elección.',
    );
    if (!confirmed) return;

    setActionLoading('reset');
    setError('');

    try {
      const res = await fetch(`${API}/election/reset`, {
        method: 'POST',
        headers: authHeaders(token),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo reiniciar la votación');
      }

      await loadElectionData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al reiniciar la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenActa = async () => {
    setPdfLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/votes/acta`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'No se pudo generar el acta';

        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          // sin acción
        }

        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al generar el acta');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleStudentInputChange = (
    field: keyof StudentFormState,
    value: string | boolean,
  ) => {
    setStudentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetStudentForm = () => {
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setStudentsError('');
  };

  const handleStudentSearch = async () => {
    await loadStudents(token, studentSearch);
  };

  const handleStudentSearchReset = () => {
    setStudentSearch('');
    setStudents([]);
    setHasSearchedStudents(false);
    setStudentsError('');
  };

  const handleStudentSubmit = async () => {
    setStudentFormLoading(true);
    setStudentsError('');

    try {
      const payload = {
        dni: studentForm.dni.trim(),
        fullName: studentForm.fullName.trim(),
        course: studentForm.course.trim(),
        enabled: studentForm.enabled,
      };

      const endpoint =
        editingStudentId === null
          ? `${API}/students`
          : `${API}/students/${editingStudentId}`;

      const method = editingStudentId === null ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo guardar el alumno');
      }

      resetStudentForm();
      await loadElectionData();

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al guardar el alumno');
      }
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      dni: student.dni,
      fullName: student.fullName,
      course: student.course,
      enabled: student.enabled,
    });
    setStudentsError('');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleToggleStudent = async (student: Student) => {
    const confirmed = window.confirm(
      student.enabled
        ? '¿Desea deshabilitar este alumno?'
        : '¿Desea habilitar este alumno?',
    );

    if (!confirmed) return;

    setStudentsError('');

    try {
      const res = await fetch(`${API}/students/${student.id}/toggle-enabled`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo actualizar el estado');
      }

      await loadElectionData();

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al actualizar el estado');
      }
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmed = window.confirm(
      `¿Desea dar de baja al alumno ${student.fullName}?`,
    );

    if (!confirmed) return;

    setStudentsError('');

    try {
      const res = await fetch(`${API}/students/${student.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo dar de baja al alumno');
      }

      if (editingStudentId === student.id) {
        resetStudentForm();
      }

      await loadElectionData();

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al dar de baja al alumno');
      }
    }
  };

  const isClosed = election ? !election.isOpen : false;

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(180deg, #0d47a1 0%, #1565c0 18%, #eaf3ff 18%, #f7fbff 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '28px 36px',
            borderRadius: '18px',
            fontWeight: 700,
            color: '#0d47a1',
            border: '3px solid #bbdefb',
          }}
        >
          Verificando acceso...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(180deg, #0d47a1 0%, #1565c0 18%, #eaf3ff 18%, #f7fbff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            background: '#fff',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '4px solid #bbdefb',
            boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          }}
        >
          <header
            style={{
              background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
              color: 'white',
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '10px',
                }}
              >
                <Image
                  src="/logo-escuela.png"
                  alt="Logo Escuela Técnica Valentín Virasoro"
                  width={90}
                  height={90}
                  priority
                />
              </div>
            </div>

            <h1 style={{ margin: 0, fontSize: '2rem' }}>Login administrador</h1>
            <p style={{ margin: '8px 0 0 0' }}>
              Sistema de votación · ETVV
            </p>
          </header>

          <section
            style={{
              padding: '32px 28px',
              background: 'linear-gradient(180deg, #fafdff 0%, #eef6ff 100%)',
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#0d47a1',
                  fontWeight: 700,
                }}
              >
                Usuario
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid #90caf9',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#0d47a1',
                  fontWeight: 700,
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid #90caf9',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>

            {loginError && (
              <div
                style={{
                  marginBottom: '18px',
                  background: '#fff3f3',
                  border: '2px solid #ffcdd2',
                  color: '#b71c1c',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontWeight: 700,
                }}
              >
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading || !username.trim() || !password.trim()}
              style={{
                width: '100%',
                background: loginLoading ? '#90a4ae' : '#1565c0',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '15px 18px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor:
                  loginLoading || !username.trim() || !password.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #0d47a1 0%, #1565c0 18%, #eaf3ff 18%, #f7fbff 100%)',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '4px solid #bbdefb',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        }}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
            color: 'white',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '18px',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '8px',
                }}
              >
                <Image
                  src="/logo-escuela.png"
                  alt="Logo Escuela Técnica Valentín Virasoro"
                  width={82}
                  height={82}
                  priority
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Mesa Electoral</h1>
                <p style={{ margin: '8px 0 0 0', fontSize: '1.05rem' }}>
                  Escuela Técnica Valentín Virasoro · Centro de Estudiantes
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>Usuario: {me?.username}</div>
              <div style={{ marginTop: '6px' }}>Rol: {me?.role}</div>
              <button
                onClick={handleLogout}
                style={{
                  marginTop: '10px',
                  background: '#ffffff',
                  color: '#1565c0',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <section
          style={{
            padding: '28px',
            background: 'linear-gradient(180deg, #fafdff 0%, #eef6ff 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '22px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: '#0d47a1' }}>
                Panel de control y estado
              </h2>
              <p style={{ margin: '8px 0 0 0', color: '#4a6482' }}>
                Última actualización: {lastUpdate || '---'}
              </p>
              {election?.openedAt && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    color: '#2e7d32',
                    fontWeight: 700,
                  }}
                >
                  Apertura: {new Date(election.openedAt).toLocaleString('es-AR')}
                </p>
              )}
              {election?.closedAt && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    color: '#c62828',
                    fontWeight: 700,
                  }}
                >
                  Cierre: {new Date(election.closedAt).toLocaleString('es-AR')}
                </p>
              )}
            </div>

            <div
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                fontWeight: 800,
                background: isClosed ? '#ffebee' : '#e8f5e9',
                color: isClosed ? '#c62828' : '#2e7d32',
                border: `2px solid ${isClosed ? '#ef9a9a' : '#a5d6a7'}`,
              }}
            >
              {isClosed ? 'VOTACIÓN CERRADA' : 'VOTACIÓN ABIERTA'}
            </div>
          </div>

          {!isClosed && (
            <div
              style={{
                marginBottom: '18px',
                background: '#fff8e1',
                border: '2px solid #ffe082',
                borderRadius: '14px',
                padding: '14px',
                color: '#6d4c41',
                fontSize: '0.97rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              Los resultados y el ganador se mostrarán una vez finalizada la votación.
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: '18px',
                background: '#fff3f3',
                border: '2px solid #ffcdd2',
                color: '#b71c1c',
                borderRadius: '14px',
                padding: '14px 16px',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Habilitados</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.totalStudents ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Votos emitidos</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.totalVotes ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Participación</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.participation ?? 0}%
              </div>
            </div>

            {isClosed && (
              <div
                style={{
                  background: '#fff',
                  border: '2px solid #d7e8ff',
                  borderRadius: '18px',
                  padding: '20px',
                }}
              >
                <div style={{ color: '#4a6482', fontWeight: 700 }}>Ganador</div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: '#0d47a1',
                  }}
                >
                  {winnerText}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0d47a1' }}>
                Resultados por lista
              </h3>

              {loading ? (
                <p style={{ color: '#4a6482' }}>Cargando resultados...</p>
              ) : isClosed ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {normalizedResults.map((item) => (
                    <div
                      key={item.option}
                      style={{
                        background: '#f4f9ff',
                        border: '2px solid #bbdefb',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#4a6482',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                          }}
                        >
                          Lista participante
                        </div>
                        <div
                          style={{
                            color: '#0d47a1',
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            marginTop: '4px',
                          }}
                        >
                          {item.option}
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: '90px',
                          textAlign: 'center',
                          background: '#1565c0',
                          color: '#fff',
                          borderRadius: '14px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
                          Votos
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                          {item.total}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '20px',
                    background: '#fff8e1',
                    border: '2px solid #ffe082',
                    borderRadius: '14px',
                    color: '#6d4c41',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Los resultados se mostrarán una vez finalizada la votación.
                </div>
              )}
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0d47a1' }}>
                Acciones de mesa
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                <button
                  onClick={loadElectionData}
                  style={{
                    background: '#1565c0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Actualizar resultados
                </button>

                {isClosed && (
                  <button
                    onClick={handleOpenActa}
                    disabled={pdfLoading}
                    style={{
                      background: pdfLoading ? '#b0bec5' : '#3949ab',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '15px 18px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: pdfLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {pdfLoading ? 'Generando acta...' : 'Ver acta PDF'}
                  </button>
                )}

                <button
                  onClick={handleOpenVoting}
                  disabled={!isClosed || actionLoading !== null}
                  style={{
                    background:
                      !isClosed || actionLoading !== null ? '#b0bec5' : '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor:
                      !isClosed || actionLoading !== null
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {actionLoading === 'open' ? 'Abriendo...' : 'Abrir votación'}
                </button>

                <button
                  onClick={handleCloseVoting}
                  disabled={isClosed || actionLoading !== null}
                  style={{
                    background:
                      isClosed || actionLoading !== null ? '#b0bec5' : '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor:
                      isClosed || actionLoading !== null
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {actionLoading === 'close' ? 'Cerrando...' : 'Cerrar votación'}
                </button>

                <button
                  onClick={handleResetVoting}
                  disabled={actionLoading !== null}
                  style={{
                    background: actionLoading !== null ? '#b0bec5' : '#ef6c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading === 'reset'
                    ? 'Reiniciando...'
                    : 'Reiniciar votación'}
                </button>
              </div>

              <div
                style={{
                  marginTop: '18px',
                  background: '#fff8e1',
                  border: '2px solid #ffe082',
                  borderRadius: '14px',
                  padding: '14px',
                  color: '#6d4c41',
                  fontSize: '0.97rem',
                  lineHeight: 1.5,
                }}
              >
                <b>Reiniciar votación</b> elimina todos los votos registrados y
                vuelve a abrir la elección.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.7fr',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <h3 style={{ margin: 0, color: '#0d47a1' }}>
                  Gestión de alumnos
                </h3>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Buscar por DNI, apellido, nombre o curso"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #90caf9',
                      minWidth: '280px',
                      outline: 'none',
                    }}
                  />

                  <button
                    onClick={handleStudentSearch}
                    style={{
                      background: '#1565c0',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Buscar
                  </button>

                  <button
                    onClick={handleStudentSearchReset}
                    style={{
                      background: '#ffffff',
                      color: '#1565c0',
                      border: '2px solid #90caf9',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {studentsError && (
                <div
                  style={{
                    marginBottom: '16px',
                    background: '#fff3f3',
                    border: '2px solid #ffcdd2',
                    color: '#b71c1c',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    fontWeight: 700,
                  }}
                >
                  {studentsError}
                </div>
              )}

              {!hasSearchedStudents ? (
                <div
                  style={{
                    padding: '20px',
                    background: '#f4f9ff',
                    border: '2px solid #bbdefb',
                    borderRadius: '14px',
                    color: '#0d47a1',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Ingrese un apellido, nombre, curso o DNI para buscar alumnos.
                </div>
              ) : studentsLoading ? (
                <p style={{ color: '#4a6482' }}>Buscando alumnos...</p>
              ) : students.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    background: '#fff8e1',
                    border: '2px solid #ffe082',
                    borderRadius: '14px',
                    color: '#6d4c41',
                    fontWeight: 700,
                  }}
                >
                  No se encontraron alumnos para la búsqueda realizada.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        background: student.enabled ? '#fafdff' : '#fff5f5',
                        border: `2px solid ${
                          student.enabled ? '#bbdefb' : '#ffcdd2'
                        }`,
                        borderRadius: '16px',
                        padding: '16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              color: '#0d47a1',
                            }}
                          >
                            {student.fullName}
                          </div>
                          <div
                            style={{
                              marginTop: '6px',
                              color: '#4a6482',
                              fontWeight: 700,
                            }}
                          >
                            DNI: {student.dni} · Curso: {student.course}
                          </div>
                          <div
                            style={{
                              marginTop: '6px',
                              fontWeight: 800,
                              color: student.enabled ? '#2e7d32' : '#c62828',
                            }}
                          >
                            {student.enabled ? 'HABILITADO' : 'DESHABILITADO'}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            onClick={() => handleEditStudent(student)}
                            style={{
                              background: '#1565c0',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Modificar
                          </button>

                          <button
                            onClick={() => handleToggleStudent(student)}
                            style={{
                              background: student.enabled ? '#ef6c00' : '#2e7d32',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {student.enabled ? 'Deshabilitar' : 'Habilitar'}
                          </button>

                          <button
                            onClick={() => handleDeleteStudent(student)}
                            disabled={!student.enabled}
                            style={{
                              background: !student.enabled ? '#b0bec5' : '#c62828',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontWeight: 800,
                              cursor: !student.enabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Dar de baja
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0d47a1' }}>
                {editingStudentId === null ? 'Agregar alumno' : 'Modificar alumno'}
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#0d47a1',
                      fontWeight: 700,
                    }}
                  >
                    DNI
                  </label>
                  <input
                    value={studentForm.dni}
                    onChange={(e) =>
                      handleStudentInputChange('dni', e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #90caf9',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#0d47a1',
                      fontWeight: 700,
                    }}
                  >
                    Nombre completo
                  </label>
                  <input
                    value={studentForm.fullName}
                    onChange={(e) =>
                      handleStudentInputChange('fullName', e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #90caf9',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#0d47a1',
                      fontWeight: 700,
                    }}
                  >
                    Curso
                  </label>
                  <input
                    value={studentForm.course}
                    onChange={(e) =>
                      handleStudentInputChange('course', e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid #90caf9',
                      outline: 'none',
                    }}
                  />
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#0d47a1',
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={studentForm.enabled}
                    onChange={(e) =>
                      handleStudentInputChange('enabled', e.target.checked)
                    }
                  />
                  Alumno habilitado para votar
                </label>

                <button
                  onClick={handleStudentSubmit}
                  disabled={
                    studentFormLoading ||
                    !studentForm.dni.trim() ||
                    !studentForm.fullName.trim() ||
                    !studentForm.course.trim()
                  }
                  style={{
                    background: studentFormLoading ? '#b0bec5' : '#1565c0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    fontWeight: 800,
                    cursor:
                      studentFormLoading ||
                      !studentForm.dni.trim() ||
                      !studentForm.fullName.trim() ||
                      !studentForm.course.trim()
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {studentFormLoading
                    ? editingStudentId === null
                      ? 'Agregando...'
                      : 'Guardando cambios...'
                    : editingStudentId === null
                    ? 'Agregar alumno'
                    : 'Guardar cambios'}
                </button>

                {editingStudentId !== null && (
                  <button
                    onClick={resetStudentForm}
                    style={{
                      background: '#ffffff',
                      color: '#1565c0',
                      border: '2px solid #90caf9',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer
          style={{
            background: '#e3f2fd',
            color: '#0d47a1',
            textAlign: 'center',
            padding: '14px 18px',
            fontWeight: 700,
            borderTop: '2px solid #bbdefb',
          }}
        >
          Escuela Técnica Valentín Virasoro · Mesa electoral
        </footer>
      </div>
    </main>
  );
}