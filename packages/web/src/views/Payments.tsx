import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuBan, LuPencil, LuPlus, LuRefreshCw } from "react-icons/lu";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { CreatePaymentRequest, MemberDTO, PaymentDTO, PaymentStatus, UpdatePaymentRequest } from "@alentapp/shared";
import { membersService } from "../services/members";
import { paymentsService } from "../services/payments";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  createListCollection,
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../components/ui/select";

type PaymentFormData = {
  amount: string;
  month: string;
  year: string;
  due_date: string;
  member_id: string;
  status: PaymentStatus;
  payment_date: string;
};

const paymentStatuses = createListCollection({
  items: [
    { label: "Pendiente", value: "Pending" },
    { label: "Pagado", value: "Paid" },
    { label: "Cancelado", value: "Canceled" },
  ],
});

const currentYear = new Date().getFullYear();

const emptyPaymentForm = (): PaymentFormData => ({
  amount: "",
  month: String(new Date().getMonth() + 1),
  year: String(currentYear),
  due_date: "",
  member_id: "",
  status: "Pending",
  payment_date: "",
});

function toIsoDateTime(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export function PaymentsView() {
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [originalPayment, setOriginalPayment] = useState<PaymentDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>(emptyPaymentForm);

  const memberOptions = useMemo(
    () =>
      createListCollection({
        items: members.map((member) => ({
          label: `${member.name} - DNI ${member.dni}`,
          value: member.id,
        })),
      }),
    [members],
  );

  const fetchPaymentsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersData, paymentsData] = await Promise.all([
        membersService.getAll(),
        paymentsService.getAll(),
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (err: any) {
      setError(err.message || "Lo sentimos! No pudimos recuperar la informacion, intente nuevamente");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPaymentId(null);
    setOriginalPayment(null);
    setFormData(emptyPaymentForm());
    setError(null);
    setSuccessMessage(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (payment: PaymentDTO) => {
    setEditingPaymentId(payment.id);
    setOriginalPayment(payment);
    setFormData({
      amount: String(payment.amount),
      month: String(payment.month),
      year: String(payment.year),
      due_date: payment.due_date,
      member_id: payment.member_id,
      status: payment.status,
      payment_date: toDateTimeLocalValue(payment.payment_date),
    });
    setError(null);
    setSuccessMessage(null);
    setIsDialogOpen(true);
  };

  const buildRequest = (): CreatePaymentRequest => {
    const request: CreatePaymentRequest = {
      amount: Number(formData.amount),
      month: Number(formData.month),
      year: Number(formData.year),
      due_date: formData.due_date,
      member_id: formData.member_id,
      status: formData.status,
      payment_date: formData.status === "Paid" ? toIsoDateTime(formData.payment_date) : null,
    };

    return request;
  };

  const buildUpdateRequest = (): UpdatePaymentRequest => {
    if (!originalPayment) {
      return {};
    }

    const request: UpdatePaymentRequest = {};
    const amount = Number(formData.amount);
    const month = Number(formData.month);
    const year = Number(formData.year);
    const paymentDate = formData.status === "Paid" ? toIsoDateTime(formData.payment_date) : null;

    if (amount !== originalPayment.amount) {
      request.amount = amount;
    }
    if (month !== originalPayment.month) {
      request.month = month;
    }
    if (year !== originalPayment.year) {
      request.year = year;
    }
    if (formData.due_date !== originalPayment.due_date) {
      request.due_date = formData.due_date;
    }
    if (formData.status !== originalPayment.status) {
      request.status = formData.status;
    }
    if (paymentDate !== originalPayment.payment_date) {
      request.payment_date = paymentDate;
    }

    return request;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingPaymentId) {
        const updateRequest = buildUpdateRequest();
        if (Object.keys(updateRequest).length === 0) {
          setSuccessMessage("No se detectaron cambios para guardar.");
          setIsDialogOpen(false);
          return;
        }
        await paymentsService.update(editingPaymentId, updateRequest);
      } else {
        await paymentsService.create(buildRequest());
      }
      await fetchPaymentsData();
      setSuccessMessage(editingPaymentId ? "Pago actualizado correctamente." : "Pago registrado correctamente.");
      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Lo sentimos! No pudimos guardar el pago, intente nuevamente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPayment = async (payment: PaymentDTO) => {
    const memberLabel = getMemberLabel(payment.member_id);
    const confirmed = window.confirm(
      `Esta accion cancelara el pago de ${memberLabel} correspondiente al periodo ${payment.month}/${payment.year}. El registro permanecera guardado. Desea continuar?`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await paymentsService.cancel(payment.id);
      await fetchPaymentsData();
      setSuccessMessage("Pago cancelado correctamente.");
    } catch (err: any) {
      setError(err.message || "Lo sentimos! No pudimos cancelar el pago, intente nuevamente");
    }
  };

  const getMemberLabel = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    return member ? `${member.name} - DNI ${member.dni}` : memberId;
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administracion de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra cuotas y pagos asociados a socios existentes.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchPaymentsData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal} disabled={members.length === 0}>
              <LuPlus /> Registrar Pago
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingPaymentId ? "Editar Pago" : "Registrar Nuevo Pago"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Socio" required>
                  <SelectRoot
                    collection={memberOptions}
                    value={formData.member_id ? [formData.member_id] : []}
                    onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] || "" })}
                    disabled={Boolean(editingPaymentId)}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione un socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberOptions.items.map((member) => (
                        <SelectItem item={member} key={member.value}>
                          {member.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                <Field label="Monto" required>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Ej. 15000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </Field>

                <HStack gap="4" align="flex-start">
                  <Field label="Mes" required>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Anio" required>
                    <Input
                      type="number"
                      min="1900"
                      max={currentYear + 1}
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      required
                    />
                  </Field>
                </HStack>

                <Field label="Fecha de vencimiento" required>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Estado" required>
                  <SelectRoot
                    collection={paymentStatuses}
                    value={[formData.status]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.value[0] as PaymentStatus,
                        payment_date: e.value[0] === "Paid" ? formData.payment_date : "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatuses.items.map((status) => (
                        <SelectItem item={status} key={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>

                {formData.status === "Paid" && (
                  <Field label="Fecha de pago" required>
                    <Input
                      type="datetime-local"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      required
                    />
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingPaymentId ? "Guardar Cambios" : "Crear Pago"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {successMessage && (
          <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
            <Text fontWeight="bold">Operacion exitosa</Text>
            <Text>{successMessage}</Text>
          </Box>
        )}

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Lo sentimos!</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando socios...</Text>
              </Stack>
            </Center>
          ) : members.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No hay socios disponibles para registrar pagos.</Text>
                <Button variant="ghost" onClick={fetchPaymentsData}>Reintentar</Button>
              </Stack>
            </Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">Todavia no se registraron pagos.</Text>
                <Button variant="ghost" onClick={openCreateModal}>Registrar primer pago</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Periodo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de pago</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payments.map((payment) => (
                  <Table.Row key={payment.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {getMemberLabel(payment.member_id)}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      {payment.month}/{payment.year}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">
                      ${payment.amount.toLocaleString("es-AR")}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{payment.due_date}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={payment.status === "Paid" ? "green.50" : payment.status === "Canceled" ? "red.50" : "orange.50"}
                        color={payment.status === "Paid" ? "green.700" : payment.status === "Canceled" ? "red.700" : "orange.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {payment.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{payment.payment_date || "-"}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar pago"
                          onClick={() => openEditModal(payment)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Cancelar pago"
                          disabled={payment.status === "Canceled"}
                          onClick={() => handleCancelPayment(payment)}
                        >
                          <LuBan />
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
