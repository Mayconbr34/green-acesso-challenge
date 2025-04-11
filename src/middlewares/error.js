/**
 * Middleware para capturar erros 404 (rotas não encontradas)
 */
const notFound = (req, res, next) => {
    const error = new Error(`Rota não encontrada - ${req.originalUrl}`);
    res.status(404);
    next(error);
  };
  
  /**
   * Middleware para tratamento de erros
   */
  const errorHandler = (err, req, res, next) => {
    // Se o status ainda for 200, definir como 500 (erro interno)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Definir o código de status na resposta
    res.status(statusCode);
    
    // Registrar erro no console em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
    
    // Enviar resposta JSON com detalhes do erro
    res.json({
      error: err.name || 'Error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
  
  /**
   * Middleware para lidar com exceções assíncronas não capturadas
   */
  const asyncErrorWrapper = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  module.exports = {
    notFound,
    errorHandler,
    asyncErrorWrapper
  };