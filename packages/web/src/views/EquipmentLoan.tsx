import { Button, Heading, HStack, Stack, Text, Flex, Input, Box, Center, Spinner, Badge, IconButton } from "@chakra-ui/react";
import { LuPlus, LuRefreshCw, LuPencil, LuTrash2 } from "react-icons/lu"; // Agregamos LuTrash2
import { useEffect, useState } from "react";
import { loansService } from "../services/loans";
import { membersService } from "../services/members";
import type { EquipmentLoanDTO, CreateEquipmentLoanRequest, MemberDTO, UpdateEquipmentLoanRequest } from "@alentapp/shared";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "../components/ui/dialog";
import { Field } from "../components/ui/field";

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<EquipmentLoanDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el Modal de Creación
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createData, setCreateData] = useState<CreateEquipmentLoanRequest>({
    member_id: "",
    item_name: "",
    due_date: "",
  });

  // Estados para el Modal de Edición
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateEquipmentLoanRequest>({
    status: "Loaned",
    due_date: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersData, loansData] = await Promise.all([
        membersService.getAll(),
        loansService.getAll()
      ]);
      setMembers(membersData.filter(m => m.status === 'Activo' && m.category !== 'Cadete'));
      setLoans(loansData);
    } catch (err: any) {
      console.error("Error al cargar los datos:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers de Creación ---
  const openCreateModal = () => {
    setCreateData({ member_id: "", item_name: "", due_date: "" });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await loansService.create(createData);
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al registrar el préstamo");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Handlers de Edición ---
  const openEditModal = (loan: EquipmentLoanDTO) => {
    setSelectedLoanId(loan.id);
    const formattedDate = loan.due_date ? new Date(loan.due_date).toISOString().slice(0, 16) : "";
    
    setEditData({
      status: loan.status,
      due_date: formattedDate,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;
    
    setIsUpdating(true);
    try {
      await loansService.update(selectedLoanId, editData);
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al actualizar el préstamo");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Handler de Eliminación (Soft Delete) ---
  const handleDelete = async (id: string) => {
    // Confirmación explícita según TDD
    const isConfirmed = window.confirm("¿Estás seguro de que deseas eliminar este préstamo?");
    if (!isConfirmed) return;

    try {
      await loansService.delete(id);
      fetchData(); // Refrescamos la grilla (el eliminado ya no debería venir por el filtro del backend)
    } catch (err: any) {
      alert(err.message || "Error al eliminar el préstamo");
    }
  };

  // Funciones de ayuda visual
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Loaned': return <Badge colorPalette="yellow">Prestado</Badge>;
      case 'Returned': return <Badge colorPalette="green">Devuelto</Badge>;
      case 'Damaged': return <Badge colorPalette="red">Dañado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <Stack gap="8">
      <Flex justify="space-between" align="center">
        <Stack gap="1">
          <Heading size="2xl" fontWeight="bold">Préstamos de Equipamiento</Heading>
          <Text color="fg.muted" fontSize="md">
            Gestiona el equipamiento prestado a los socios del club.
          </Text>
        </Stack>
        <HStack gap="3">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <LuRefreshCw /> Actualizar
          </Button>
          <Button colorPalette="blue" size="md" onClick={openCreateModal}>
            <LuPlus /> Registrar Préstamo
          </Button>
        </HStack>
      </Flex>

      {/* Grilla principal */}
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" p="6" minH="200px" overflowX="auto">
        {isLoading ? (
          <Center h="150px">
            <Stack align="center" gap="4">
              <Spinner size="xl" color="blue.500" />
              <Text color="fg.muted">Cargando datos...</Text>
            </Stack>
          </Center>
        ) : loans.length === 0 ? (
          <Center h="150px">
            <Text color="fg.muted">No hay préstamos registrados.</Text>
          </Center>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Socio</th>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Equipamiento</th>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Fecha Préstamo</th>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Devolución Esperada</th>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Estado</th>
                <th style={{ padding: '12px', color: '#a0aec0', fontWeight: '600' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => (
                <tr key={loan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px' }}>
                    {members.find(m => m.id === loan.member_id)?.name || 'Socio Desconocido'}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{loan.item_name}</td>
                  <td style={{ padding: '12px' }}>{formatDate(loan.loan_date)}</td>
                  <td style={{ padding: '12px' }}>{formatDate(loan.due_date)}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(loan.status)}</td>
                  <td style={{ padding: '12px' }}>
                    <HStack gap="2">
                      <IconButton 
                        aria-label="Editar préstamo" 
                        variant="ghost" 
                        size="sm"
                        disabled={loan.status === 'Returned' || loan.status === 'Damaged'}
                        onClick={() => openEditModal(loan)}
                      >
                        <LuPencil />
                      </IconButton>
                      <IconButton 
                        aria-label="Eliminar préstamo" 
                        variant="ghost"
                        colorPalette="red"
                        size="sm"
                        // Deshabilitamos el tachito si el estado es terminal
                        disabled={loan.status === 'Returned' || loan.status === 'Damaged'}
                        onClick={() => handleDelete(loan.id)}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </HStack>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Box>

      {/* MODAL DE CREACIÓN */}
      <DialogRoot open={isCreateOpen} onOpenChange={(e) => setIsCreateOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Socio" required>
                  <select 
                    value={createData.member_id}
                    onChange={(e) => setCreateData({ ...createData, member_id: e.target.value })}
                    required
                    style={{ 
                      width: '100%', padding: '8px 12px', borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.24)', backgroundColor: 'transparent', 
                      color: 'white', outline: 'none'
                    }}
                  >
                    <option value="" style={{ background: '#1a202c', color: 'white' }}>Seleccione un socio...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#1a202c', color: 'white' }}>
                        {m.name} ({m.dni})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nombre del Equipamiento" required>
                  <Input 
                    placeholder="Ej. Pelota de Básquet" 
                    value={createData.item_name}
                    onChange={(e) => setCreateData({ ...createData, item_name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha Esperada de Devolución">
                  <Input 
                    type="datetime-local" 
                    value={createData.due_date}
                    onChange={(e) => setCreateData({ ...createData, due_date: e.target.value })}
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isCreating}>
                Crear Préstamo
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

      {/* MODAL DE EDICIÓN (UPDATE) */}
      <DialogRoot open={isEditOpen} onOpenChange={(e) => setIsEditOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Actualizar Préstamo</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Estado del Préstamo" required>
                  <select 
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    required
                    style={{ 
                      width: '100%', padding: '8px 12px', borderRadius: '6px', 
                      border: '1px solid rgba(255, 255, 255, 0.24)', backgroundColor: 'transparent', 
                      color: 'white', outline: 'none'
                    }}
                  >
                    <option value="Loaned" style={{ background: '#1a202c', color: 'white' }}>En Préstamo (Loaned)</option>
                    <option value="Returned" style={{ background: '#1a202c', color: 'white' }}>Devuelto (Returned)</option>
                    <option value="Damaged" style={{ background: '#1a202c', color: 'white' }}>Dañado (Damaged)</option>
                  </select>
                </Field>
                <Field label="Fecha Esperada de Devolución">
                  <Input 
                    type="datetime-local" 
                    value={editData.due_date}
                    onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isUpdating}>
                Guardar Cambios
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

    </Stack>
  );
}