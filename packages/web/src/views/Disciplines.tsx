import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { LuPencil, LuPlus, LuRefreshCw, LuShieldAlert, LuTrash2 } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import type { CreateDisciplineRequest, DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';
import { disciplinesService } from '../services/disciplines';
import { Field } from '../components/ui/field';
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '../components/ui/dialog';

const emptyForm: CreateDisciplineRequest = {
  memberId: '',
  reason: '',
  startDate: '',
  endDate: '',
  isTotalSuspension: false,
};

function toDateTimeInputValue(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR');
}

export function DisciplinesView() {
  const [disciplines, setDisciplines] = useState<DisciplineDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDisciplineId, setEditingDisciplineId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateDisciplineRequest>(emptyForm);

  const fetchDisciplines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disciplinesService.getAll();
      setDisciplines(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las disciplinas');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDisciplineId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditModal = (discipline: DisciplineDTO) => {
    setEditingDisciplineId(discipline.id);
    setFormData({
      memberId: discipline.memberId,
      reason: discipline.reason,
      startDate: toDateTimeInputValue(discipline.startDate),
      endDate: toDateTimeInputValue(discipline.endDate),
      isTotalSuspension: discipline.isTotalSuspension,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDisciplineId) {
        const data: UpdateDisciplineRequest = {
          reason: formData.reason,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isTotalSuspension: formData.isTotalSuspension,
        };
        await disciplinesService.update(editingDisciplineId, data);
      } else {
        await disciplinesService.create(formData);
      }
      setIsDialogOpen(false);
      fetchDisciplines();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la disciplina');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (discipline: DisciplineDTO) => {
    if (window.confirm(`¿Eliminar la disciplina "${discipline.reason}"? Esta acción no se puede deshacer.`)) {
      try {
        await disciplinesService.delete(discipline.id);
        fetchDisciplines();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la disciplina');
      }
    }
  };

  useEffect(() => {
    fetchDisciplines();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Disciplina</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona sanciones y suspensiones disciplinarias de socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchDisciplines} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Disciplina
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingDisciplineId ? 'Editar Disciplina' : 'Agregar Nueva Disciplina'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {!editingDisciplineId && (
                  <Field label="ID del socio" required>
                    <Input
                      placeholder="UUID del socio"
                      value={formData.memberId}
                      onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                      required
                    />
                  </Field>
                )}
                <Field label="Motivo" required>
                  <Input
                    placeholder="Ej. Conducta antideportiva"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de inicio" required>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha de fin" required>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </Field>
                <Checkbox.Root
                  checked={formData.isTotalSuspension}
                  onCheckedChange={(e) => setFormData({ ...formData, isTotalSuspension: e.checked === true })}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Suspensión total</Checkbox.Label>
                </Checkbox.Root>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingDisciplineId ? 'Guardar Cambios' : 'Crear Disciplina'}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando disciplinas...</Text>
              </Stack>
            </Center>
          ) : disciplines.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <LuShieldAlert size="32" />
                <Text color="fg.muted">No se encontraron disciplinas.</Text>
                <Button variant="ghost" onClick={fetchDisciplines}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Motivo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Inicio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fin</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Total</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {disciplines.map((discipline) => (
                  <Table.Row key={discipline.id} _hover={{ bg: 'bg.muted/30' }}>
                    <Table.Cell fontWeight="semibold">{discipline.reason}</Table.Cell>
                    <Table.Cell color="fg.muted">{discipline.memberId}</Table.Cell>
                    <Table.Cell color="fg.muted">{formatDate(discipline.startDate)}</Table.Cell>
                    <Table.Cell color="fg.muted">{formatDate(discipline.endDate)}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={discipline.isTotalSuspension ? 'red.50' : 'blue.50'}
                        color={discipline.isTotalSuspension ? 'red.700' : 'blue.700'}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {discipline.isTotalSuspension ? 'Sí' : 'No'}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton variant="ghost" size="sm" aria-label="Editar disciplina" onClick={() => openEditModal(discipline)}>
                          <LuPencil />
                        </IconButton>
                        <IconButton variant="ghost" size="sm" colorPalette="red" aria-label="Eliminar disciplina" onClick={() => handleDelete(discipline)}>
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
