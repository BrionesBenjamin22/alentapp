import { Button, Heading, HStack, Stack, Text, Flex, Input, Box, Center, Spinner } from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { loansService } from "../services/loans";
import { membersService } from "../services/members";
import type { EquipmentLoanDTO, CreateEquipmentLoanRequest, MemberDTO } from "@alentapp/shared";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "../components/ui/dialog";
import { Field } from "../components/ui/field";

export function EquipmentLoansView() {
  const [loans, setLoans] = useState<EquipmentLoanDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateEquipmentLoanRequest>({
    member_id: "",
    item_name: "",
    due_date: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [loansData, membersData] = await Promise.all([
        loansService.getAll(),
        membersService.getAll()
      ]);
      setLoans(loansData);
      setMembers(membersData.filter(m => m.status === 'Activo' && m.category !== 'Cadete')); // Filtramos para la UI
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setFormData({ member_id: "", item_name: "", due_date: "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loansService.create(formData);
      setIsDialogOpen(false);
      fetchData(); // Refresh data
    } catch (err: any) {
      alert(err.message || "Error al registrar el préstamo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
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

        {/* Modal para agregar préstamo */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Socio" required>
                  <select 
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="">Seleccione un socio...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.dni})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Nombre del Equipamiento" required>
                  <Input 
                    placeholder="Ej. Pelota de Básquet" 
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fecha Esperada de Devolución">
                  <Input 
                    type="datetime-local" 
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Préstamo
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {/* Grilla temporal y estado de carga */}
        <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" p="6" minH="200px" position="relative">
          {isLoading ? (
            <Center h="150px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando datos...</Text>
              </Stack>
            </Center>
          ) : (
            <>
              <Text>Aquí irá la grilla (Implementaremos el Read en la siguiente rama).</Text>
              <Text mt="2" color="blue.500" fontWeight="bold">
                Préstamos cargados en memoria por ahora: {loans.length}
              </Text>
            </>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}