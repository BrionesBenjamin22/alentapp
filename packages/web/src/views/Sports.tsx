import { 
  Button, 
  Heading, 
  HStack, 
  IconButton,
  Stack, 
  Text, 
  Box,
  Flex,
  Input,
  Table,
  Spinner,
  Center
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw, LuPencil, LuTrash } from "react-icons/lu";
import { useEffect, useState } from "react";
import { sportsService } from "../services/sports";
import type { SportDTO, CreateSportRequest, UpdateSportRequest } from "@alentapp/shared";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

export function SportsView() {
  // State for the modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateSportRequest>({
    name: "",
    description: "",
    maxCapacity: 0,
    additionalPrice: 0,
    isFederated: false,
  });

  const fetchSports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los deportes");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSportId(null);
    setFormData({ 
      name: "", 
      description: "", 
      maxCapacity: 0,
      additionalPrice: 0,
      isFederated: false,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (sport: SportDTO) => {
    setEditingSportId(sport.id);
    setFormData({
      name: sport.name,
      description: sport.description,
      maxCapacity: sport.maxCapacity,
      additionalPrice: sport.additionalPrice,
      isFederated: sport.isFederated,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingSportId) {
        const updateData: UpdateSportRequest = {
          description: formData.description,
          maxCapacity: formData.maxCapacity,
        };
      await sportsService.update(editingSportId, updateData);
      setSuccessMessage("¡Deporte actualizado exitosamente!");
      } else {
        await sportsService.create(formData);
        setSuccessMessage("¡Deporte creado exitosamente!");
      }
      setIsDialogOpen(false);
      fetchSports();
      setTimeout(() => {
        setSuccessMessage(null);
        setFormData({
          name: "",
          description: "",
          maxCapacity: 0,
          additionalPrice: 0,
          isFederated: false,
        });
        setEditingSportId(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sportId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este deporte?')) {
      try {
        await sportsService.deleteSport(sportId);
        setSuccessMessage("¡Deporte eliminado exitosamente!");
        fetchSports();
        setTimeout(() => {
          setSuccessMessage(null);
        }, 2000);
      } catch (error: any) {
        setErrorMessage(error.message || "Error al eliminar el deporte");
      }
    }
  };
  
  useEffect(() => {
    fetchSports();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
            <Text color="fg.muted" fontSize="md">
              Crea nuevos deportes y configura los parámetros del catálogo de actividades.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Deporte
            </Button>
          </HStack>
        </Flex>

        {/* Modal para agregar deporte */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Deporte</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre del Deporte" required>
                  <Input 
                    placeholder="Ej. Fútbol" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={!!editingSportId}
                  />
                </Field>
                <Field label="Descripción" required>
                  <Input 
                    placeholder="Ej. Deporte de equipo con pelota" 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Cupo Máximo" required>
                  <Input 
                    type="number" 
                    placeholder="Ej. 20" 
                    value={formData.maxCapacity === 0 ? '' : formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 0 })}
                    required
                    min="1"
                  />
                </Field>
                {!editingSportId && (
                  <>
                    <Field label="Precio Adicional (opcional)">
                      <Input 
                        type="number" 
                        placeholder="Ej. 50.00" 
                        value={formData.additionalPrice === 0 ? '' : formData.additionalPrice}
                        onChange={(e) => setFormData({ ...formData, additionalPrice: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                      />
                    </Field>
                    <Field label="¿Es una actividad federada?">
                      <input 
                        type="checkbox" 
                        checked={formData.isFederated}
                        onChange={(e) => setFormData({ ...formData, isFederated: e.target.checked })}
                      />
                    </Field>
                  </>
                )}
              </Stack>
              {errorMessage && (
                <Box mt="4" p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                  <Text fontSize="sm">{errorMessage}</Text>
                </Box>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingSportId ? "Guardar Cambios" : "Crear Deporte"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {successMessage && (
          <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
            <Text fontWeight="bold">Éxito:</Text>
            <Text>{successMessage}</Text>
          </Box>
        )}

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
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
                <Text color="fg.muted">Cargando deportes...</Text>
              </Stack>
            </Center>
          ) : sports.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron deportes.</Text>
                <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Cupo Máximo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Cupo Disponible</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Precio Adicional</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Federado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sports.map((sport) => (
                  <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {sport.name}
                    </Table.Cell>
                    <Table.Cell>
                      {sport.description}
                    </Table.Cell>
                    <Table.Cell>
                      {sport.maxCapacity}
                    </Table.Cell>
                    <Table.Cell>
                      ${sport.additionalPrice.toFixed(2)}
                    </Table.Cell>
                    <Table.Cell>
                      {sport.isFederated ? "Sí" : "No"}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="end">
                        <IconButton 
                          aria-label="Editar deporte"
                          size="sm" 
                          variant="ghost"
                          onClick={() => openEditModal(sport)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton 
                          aria-label="Eliminar deporte"
                          size="sm" 
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleDelete(sport.id)}
                        >
                          <LuTrash />
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
