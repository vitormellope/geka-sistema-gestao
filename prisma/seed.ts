import { PrismaClient, Role } from "../src/generated/prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Users ──────────────────────────────────────────────────────────────────

  const usersData = [
    { name: "Gerente Geka", email: "gerente@geka.com", password: "geka123", role: Role.gerente },
    { name: "Orçamentista Geka", email: "orcamentista@geka.com", password: "geka123", role: Role.orcamentista },
    { name: "Vendedor Geka", email: "vendedor@geka.com", password: "geka123", role: Role.vendedor },
    { name: "Assistente Geka", email: "assistente@geka.com", password: "geka123", role: Role.assistente },
    { name: "Projetista Geka", email: "projetista@geka.com", password: "geka123", role: Role.projetista },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: bcryptjs.hashSync(u.password, 12),
        role: u.role,
      },
    });
    console.log(`  User upserted: ${user.name} (${user.email})`);
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  const categoriesData = [
    {
      name: "PDV",
      fieldsSchema: [
        { name: "quantidade", label: "Quantidade", type: "number", required: true, options: [] },
        { name: "medidas", label: "Medidas", type: "text", required: true, options: [] },
        { name: "material_base", label: "Material Base", type: "select", required: true, options: ["ACM", "MDF", "Forex", "Lona", "Acrílico", "Outro"] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "ponto_de_venda", label: "Ponto de Venda", type: "text", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
    {
      name: "Cenografia",
      fieldsSchema: [
        { name: "quantidade", label: "Quantidade", type: "number", required: true, options: [] },
        { name: "medidas", label: "Medidas", type: "text", required: true, options: [] },
        { name: "material_base", label: "Material Base", type: "select", required: true, options: ["MDF", "Madeira", "Metalon", "Tecido", "Misto", "Outro"] },
        { name: "local_instalacao", label: "Local de Instalação", type: "text", required: true, options: [] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "montagem_inclusa", label: "Montagem Inclusa", type: "boolean", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
    {
      name: "Display Aramado",
      fieldsSchema: [
        { name: "quantidade", label: "Quantidade", type: "number", required: true, options: [] },
        { name: "medidas", label: "Medidas", type: "text", required: true, options: [] },
        { name: "tipo_display", label: "Tipo de Display", type: "select", required: true, options: ["Expositor de chão", "Expositor de balcão", "Gôndola", "Rack", "Outro"] },
        { name: "capacidade", label: "Capacidade", type: "number", required: false, options: [] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "acabamento", label: "Acabamento", type: "text", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
    {
      name: "Sinalização",
      fieldsSchema: [
        { name: "quantidade", label: "Quantidade", type: "number", required: true, options: [] },
        { name: "medidas", label: "Medidas", type: "text", required: true, options: [] },
        { name: "tipo_sinalizacao", label: "Tipo de Sinalização", type: "select", required: true, options: ["Placa de identificação", "Totem", "Banner", "Faixa", "Adesivo", "Outro"] },
        { name: "material_base", label: "Material Base", type: "select", required: true, options: ["ACM", "PVC", "Acrílico", "Lona", "Vidro", "Outro"] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "instalacao_inclusa", label: "Instalação Inclusa", type: "boolean", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
    {
      name: "Evento",
      fieldsSchema: [
        { name: "nome_evento", label: "Nome do Evento", type: "text", required: true, options: [] },
        { name: "data_evento", label: "Data do Evento", type: "text", required: true, options: [] },
        { name: "local_evento", label: "Local do Evento", type: "text", required: true, options: [] },
        { name: "area_stand", label: "Área do Stand", type: "number", required: false, options: [] },
        { name: "tipo_estrutura", label: "Tipo de Estrutura", type: "select", required: false, options: ["Octanorm", "Madeira", "Tubular", "Misto", "Outro"] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "montagem_desmontagem", label: "Montagem e Desmontagem", type: "boolean", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
    {
      name: "Projeto Customizado",
      fieldsSchema: [
        { name: "descricao_projeto", label: "Descrição do Projeto", type: "textarea", required: true, options: [] },
        { name: "medidas", label: "Medidas", type: "text", required: false, options: [] },
        { name: "material_base", label: "Material Base", type: "select", required: false, options: ["A definir", "ACM", "MDF", "Acrílico", "Metal", "Misto", "Outro"] },
        { name: "quantidade", label: "Quantidade", type: "number", required: false, options: [] },
        { name: "arte_aprovada", label: "Arte Aprovada", type: "boolean", required: false, options: [] },
        { name: "referencia_visual", label: "Referência Visual", type: "text", required: false, options: [] },
        { name: "observacoes", label: "Observações", type: "textarea", required: false, options: [] },
      ],
    },
  ];

  for (const c of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: {
        name: c.name,
        fieldsSchema: c.fieldsSchema,
      },
    });
    console.log(`  Category upserted: ${category.name}`);
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
