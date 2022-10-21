const router = require('express').Router()
const avanceModel = require('../models/avance')
const docenteModel = require('../models/docente')
const { paginationSize } = require('../constants/constants')

router.get('/', async (req, res) => {
  try {
    const pageNumber = req.query.page || 0;
    const search = req.query.search;
    const dateCreationFrom = req.query.dateCreationFrom;
    const dateCreationTo = req.query.dateCreationTo;
    const query = {}

    if (dateCreationFrom || dateCreationTo) {
      query.fechaCreacion = {}
      if (dateCreationFrom) {
        query.fechaCreacion.$gte = new Date(new Date(dateCreationFrom).toDateString()).toISOString();
      }
      if (dateCreationTo) {
        query.fechaCreacion.$lte = new Date(new Date(dateCreationTo).toDateString()).toISOString();
      }
    }

    if (search) {
      const regex = new RegExp(search, 'ig');
      const or = {
        $or: [
          { 'descripcion': regex },
        ]
      }
      query['$and'] = [query, or];
    }

    const advancementsPromise = avanceModel.find(query)
      .skip(pageNumber > 0 ? (pageNumber * paginationSize) : 0)
      .limit(paginationSize).sort({ fechaCreacion: -1 });

    const advancementsCountPromise = avanceModel.count(query);

    const [advancements, advancementsCount] = await Promise.all([advancementsPromise, advancementsCountPromise])
    res.status(200).json({ advancements, advancementsCount })
  } catch (error) {
    res.status(400).json({
      error: true,
      description: error.message
    })
  }
})

router.get('/professor', async (req, res) => {
  try {
    const pageNumber = req.query.page || 0;
    const { search, dateCreationFrom, dateCreationTo, email: correo } = req.query
    const professor = await docenteModel.findOne({ correo })
    let query = {}

    if (!professor) {
      return res.status(400).json({
        error: "Wrong data provided",
        description: 'Professor does not exist'
      });
    }

    if (dateCreationFrom || dateCreationTo) {
      query.fechaCreacion = {}
      if (dateCreationFrom) {
        query.fechaCreacion.$gte = new Date(new Date(dateCreationFrom).toDateString()).toISOString();
      }
      if (dateCreationTo) {
        query.fechaCreacion.$lte = new Date(new Date(dateCreationTo).toDateString()).toISOString();
      }
    }

    if (search) {
      var regex = new RegExp(search, 'ig');
      const or = {
        $or: [
          { 'descripcion': regex },
        ]
      }
      query = {
        $and: [query, or],
        $and: [{ 'docenteId': professor._id }]
      };
    } else {
      query = {
        $and: [{ 'docenteId': professor._id }]
      };
    }


    const advancementsPromise = avanceModel.find(query)
      .skip(pageNumber > 0 ? (pageNumber * paginationSize) : 0)
      .limit(paginationSize).sort({ fechaCreacion: -1 });

    const advancementsCountPromise = avanceModel.count(query);

    const [advancements, advancementsCount] = await Promise.all([advancementsPromise, advancementsCountPromise])
    res.status(200).json({ advancements, advancementsCount })
  } catch (error) {
    res.status(400).json({
      error: true,
      description: error.message
    })
  }
})

router.get('/professor/:id', async (req, res) => {
  try {
    let query = {}
    const { id } = req.params;
    const { advancementYear, period, page, pageSize } = req.query;
    const pageNumber = page || 0;
    const paginationSizeLocal = pageSize || paginationSize;
    const year = new Date(`${advancementYear}-1-1`).toISOString()

    query = { añoAvance: { $eq: year }, periodo: { $eq: period }, docenteId: { $eq: id } }

    const advancementsPromise = avanceModel.find(query)
      .skip(pageNumber > 0 ? (pageNumber * paginationSize) : 0)
      .limit(paginationSizeLocal).sort({ fechaCreacion: -1 });

    const advancementsCountPromise = avanceModel.count(query);

    const [advancements, advancementsCount] = await Promise.all([advancementsPromise, advancementsCountPromise])
    res.status(200).json({ advancements, advancementsCount })
  } catch (error) {
    res.status(400).json({
      error: true,
      description: error.message
    })
  }
})

router.post('/add', async (req, res) => {
  try {
    const avance = new avanceModel({
      programaId: req.body.programaId,
      planId: req.body.planId,
      areaId: req.body.areaId,
      asignaturaId: req.body.asignaturaId,
      docenteId: req.body.docenteId,
      contenido: req.body.contenido,
      añoAvance: req.body.añoAvance,
      periodo: req.body.periodo,
      porcentajeAvance: req.body.porcentajeAvance,
      descripcion: req.body.descripcion,
      fechaActualizacion: new Date(),
      fechaCreacion: new Date(),
      estado: true,
    })
    const save = await avance.save();
    res.send(save);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: true,
      descripcion: err.message
    });
  }

})

router.get('/allNotPaginated', async (req, res) => {
  try {
    let query = {}

    //Datos para los filtros
    let search = req.query.search;

    if (search) {
      var regex = new RegExp(search, 'ig');
      const or = {
        $or: [
          { 'identificacionSolicitante': regex },
          { 'nombreSolicitante': regex },
          { 'universidadSolicitante': regex },
          { 'programaSolicitante': regex },
          { 'asignaturaSolicitante': regex },
        ]
      }
      query = {
        $and: [query, or],
      };
    }

    const avances = await avanceModel.find(query);
    res.status(200).json({
      error: false,
      descripcion: "Consulta Exitosa",
      avances
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: true,
      descripcion: error.message
    })
  }
})

router.post('/allByAsignatura', async (req, res) => {
  try {
    let query = {}
    let pageNumber = req.body.page ? req.body.page * 1 : 0;
    let paginationSizeLocal = req.body.paginationSize || paginationSize;


    //Datos para los filtros
    let añoAvance = req.body.añoAvance;
    let periodo = req.body.periodo;
    let asignaturaId = req.body.asignaturaId;

    query = { añoAvance: { $eq: añoAvance }, periodo: { $eq: periodo }, asignaturaId: { $eq: asignaturaId } }

    const avances = await avanceModel.find(query).skip(pageNumber > 0 ? (pageNumber * paginationSizeLocal) : 0)
      .limit(paginationSizeLocal).sort({ fechaCreacion: -1 });

    const totalAvances = await avanceModel.count(query);

    res.status(200).json({
      error: false,
      descripcion: "Consulta Exitosa",
      avances,
      totalAvances
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: true,
      descripcion: error.message
    })
  }
})

router.post('/allByPeriodo', async (req, res) => {
  try {
    let query = {}
    let pageNumber = req.body.page ? req.body.page * 1 : 0;

    //Datos para los filtros
    let añoAvance = req.body.añoAvance;
    let periodo = req.body.periodo;

    query = { añoAvance: { $eq: añoAvance }, periodo: { $eq: periodo } }

    const avances = await avanceModel.find(query).skip(pageNumber > 0 ? (pageNumber * paginationSize) : 0)
      .limit(paginationSize).sort({ fechaCreacion: -1 });

    const totalAvances = await avanceModel.count(query);

    res.status(200).json({
      error: false,
      descripcion: "Consulta Exitosa",
      avances,
      totalAvances
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: true,
      descripcion: error.message
    })
  }
})

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const homologacion = await avanceModel.findById(id);
  try {
    res.send(homologacion)
  } catch (error) {
    res.send(error.message)
  }
})

router.delete('/:id', async (req, res) => {
  const homologacionId = req.params.id;
  const homologacion = avanceModel.remove({
    _id: id
  })
  try {
    res.send(homologacion)
  } catch (error) {
    res.send(error.message)
  }

})

router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const homologacion = {
      programaId: req.body.programaId,
      planId: req.body.planId,
      areaId: req.body.areaId,
      asignaturaId: req.body.asignaturaId,
      docenteId: req.body.docenteId,
      contenido: req.body.contenido,
      añoAvance: req.body.añoAvance,
      periodo: req.body.periodo,
      porcentajeAvance: req.body.porcentajeAvance,
      descripcion: req.body.descripcion,
      fechaActualizacion: new Date(),
    };
    const update = await avanceModel.updateOne({
      _id: id
    }, {
      $set: homologacion
    });
    res.status(200).json({
      error: false,
      descripcion: "Registro Actualizado Exitosamente",
      homologacion: update
    })
  } catch (error) {
    res.send(error.message)
  }

})

module.exports = router
