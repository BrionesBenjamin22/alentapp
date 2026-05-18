import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { LuUsers, LuCreditCard, LuShieldAlert, LuClipboardList, LuDumbbell } from "react-icons/lu";
import { SectionCard } from "../components/SectionCard";

export function HomeView() {
  return (
    <Box>
      <VStack gap="6" align="flex-start" mb="12">
        <Heading 
          size="4xl" 
          fontWeight="extrabold" 
          letterSpacing="tight"
          bgGradient="to-r"
          gradientFrom="blue.600"
          gradientTo="cyan.400"
          bgClip="text"
        >
          Bienvenido a Alentapp
        </Heading>
        <Text fontSize="xl" color="fg.muted" maxW="2xl">
          El panel de administración central para gestionar todos los aspectos de tu club. 
          Selecciona una sección a continuación para comenzar.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8">
        <SectionCard 
          title="Miembros"
          description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
          to="/members"
          icon={LuUsers}
        />
        
        <SectionCard 
          title="Deportes"
          description="Gestiona el catálogo de actividades, cupos disponibles, precios y disciplinas federadas."
          to="/sports"
          icon={LuDumbbell}
        />

        <SectionCard
          title="Pagos"
          description="Registra cuotas y movimientos económicos asociados a socios existentes."
          to="/payments"
          icon={LuCreditCard}
        />

        <SectionCard
          title="Disciplina"
          description="Registra, actualiza y elimina sanciones disciplinarias de los socios."
          to="/disciplines"
          icon={LuShieldAlert}
        />

        <SectionCard 
          title="Préstamos"
          description="Gestiona el préstamo de equipamiento del club a los socios habilitados."
          to="/equipment-loans"
          icon={LuClipboardList}
        />
        
        <Box 
          p="6" 
          bg="bg.muted/30" 
          borderRadius="2xl" 
          borderWidth="1px" 
          borderColor="border.subtle"
          borderStyle="dashed"
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="250px"
        >
          <VStack>
            <Text color="fg.muted" fontWeight="medium">Próximamente nuevas secciones</Text>
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
}