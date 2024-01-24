const asyncHandler = (requestHandler) => {
    (req,res,next)=>{
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))
    }
}

export {asyncHandler}


                    //Try catch approach

// //Steps of higher order function
// // const asyncHandler = () => {}
// // const asyncHandler = (fn) => () => {}   //take in fn and pass it down to another func
// // const asyncHandler = (fn) => async() => {}

// const asyncHandler = (fn) => async(req,res,next) => {
//     try {
//         await fn(req,res,next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }